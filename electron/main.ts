import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { updateElectronApp } from 'update-electron-app';
import {
    ScanRequestSchema,
    GetInvoiceCandidatesRequestSchema,
    MergeRequestSchema,
    IPC_CHANNELS,
    type ScanResponse,
    type GetInvoiceCandidatesResponse,
    type MergeResponse,
} from './ipc/types';
import { scanForClients, getInvoiceCandidatesForClient } from './lib/fs/discovery';
import { mergeInvoiceWithBackups } from './lib/pdf/merge';
import { getUniqueOutputPath } from './lib/naming';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure auto-updates via update.electronjs.org using GitHub Releases
updateElectronApp({
    repo: 'XP3R-Inc/kalcon_pdf-merger',
    updateInterval: '1 hour',
});

// Register custom app:// protocol for serving static Next.js export
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'app',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
        },
    },
]);

let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        title: 'Invoice Merger',
    });

    // In development, load from Next.js dev server
    // In production, load from custom app:// protocol
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // Load the main HTML file via custom protocol
        mainWindow.loadURL('app://-/index.html').catch((err) => {
            console.error('Failed to load app protocol:', err);
        });

        // Add debugging for when the page loads
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('Page finished loading');
            // Ensure DevTools are closed in production
            if (mainWindow && mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            }
            // Check if the page has content
            if (mainWindow) {
                mainWindow.webContents.executeJavaScript(`
                    console.log('Document ready state:', document.readyState);
                    console.log('Body content length:', document.body.innerHTML.length);
                    console.log('Window electronAPI available:', typeof window.electronAPI !== 'undefined');
                    console.log('Scripts loaded:', document.scripts.length);
                `);
            }
        });

        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error('Page failed to load:', { errorCode, errorDescription, validatedURL });
        });
    }
};

/**
 * App lifecycle
 */
app.whenReady().then(() => {
    // Map app:// URLs to files inside the exported Next.js directory
    const outDir = app.isPackaged
        ? path.join(process.resourcesPath, 'out')
        : path.join(process.cwd(), 'out');

    protocol.registerFileProtocol('app', (request, callback) => {
        try {
            const url = new URL(request.url);
            // We use host '-' to denote root; ignore it
            let pathname = decodeURI(url.pathname);
            if (pathname.endsWith('/')) {
                pathname = pathname + 'index.html';
            }
            // Ensure no leading slash traversal
            const safePath = pathname.replace(/^\/+/, '');
            const filePath = path.join(outDir, safePath);
            callback({ path: filePath });
        } catch (e) {
            console.error('Protocol error:', e);
            callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * IPC Handlers
 */

// Scan for clients and periods
ipcMain.handle(IPC_CHANNELS.SCAN, async (_, request): Promise<ScanResponse> => {
    try {
        const validated = ScanRequestSchema.parse(request);
        const clients = await scanForClients(validated);
        return { clients };
    } catch (error) {
        console.error('Scan error:', error);
        throw error;
    }
});

// Get invoice candidates for a client/period
ipcMain.handle(
    IPC_CHANNELS.GET_INVOICE_CANDIDATES,
    async (_, request): Promise<GetInvoiceCandidatesResponse> => {
        try {
            const validated = GetInvoiceCandidatesRequestSchema.parse(request);
            const candidates = await getInvoiceCandidatesForClient(
                validated.clientPath,
                validated.fiscalYear,
                validated.month
            );
            return { candidates };
        } catch (error) {
            console.error('Get invoice candidates error:', error);
            throw error;
        }
    }
);

// Merge invoice with backups
ipcMain.handle(IPC_CHANNELS.MERGE, async (_, request): Promise<MergeResponse> => {
    try {
        const validated = MergeRequestSchema.parse(request);
        const results = [];

        for (const job of validated.jobs) {
            try {
                // Determine output path
                let outputPath: string;
                const invoiceName = path.basename(job.invoicePath, '.pdf');

                if (validated.outputMode === 'custom-folder' && validated.customOutputPath) {
                    outputPath = await getUniqueOutputPath(
                        validated.customOutputPath,
                        job.month,
                        invoiceName,
                        job.clientName,
                        job.fiscalYear,
                        validated.filenameTemplate
                    );
                } else {
                    // Save to client's Invoice folder
                    const invoiceDir = path.dirname(job.invoicePath);
                    outputPath = await getUniqueOutputPath(
                        invoiceDir,
                        job.month,
                        invoiceName,
                        job.clientName,
                        job.fiscalYear,
                        validated.filenameTemplate
                    );
                }

                // Perform merge
                await mergeInvoiceWithBackups(
                    job.invoicePath,
                    job.backupPaths,
                    outputPath
                );

                results.push({
                    clientName: job.clientName,
                    success: true,
                    outputPath,
                });
            } catch (error) {
                results.push({
                    clientName: job.clientName,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return { results };
    } catch (error) {
        console.error('Merge error:', error);
        throw error;
    }
});

// Pick output directory
ipcMain.handle(IPC_CHANNELS.PICK_OUTPUT_DIR, async (): Promise<string | null> => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Output Directory',
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths[0];
});

