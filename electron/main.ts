import { app, BrowserWindow, ipcMain, dialog, protocol, shell, Menu, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import log from 'electron-log';
import { updateElectronApp } from 'update-electron-app';
import { Octokit } from '@octokit/rest';
import {
    ScanRequestSchema,
    GetInvoiceCandidatesRequestSchema,
    MergeRequestSchema,
    IPC_CHANNELS,
    ReportIssuePayloadSchema,
    type ScanResponse,
    type GetInvoiceCandidatesResponse,
    type MergeResponse,
} from './ipc/types';
import { scanForClients, getInvoiceCandidatesForClient } from './lib/fs/discovery';
import { mergeInvoiceWithBackups } from './lib/pdf/merge';
import { getUniqueOutputPath } from './lib/naming';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// This is handled by electron-squirrel-startup package in production builds
// In development, this module won't exist and we continue normally

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

if (app.isPackaged) {
    updateElectronApp({
        repo: 'XP3R-Inc/kalcon_pdf-merger',
        logger: log,
        updateInterval: '1 hour',
    });
}

let mainWindow: BrowserWindow | null = null;
const issueRepo = { owner: 'XP3R-Inc', name: 'kalcon_pdf-merger' };
const issueLabels = ['runtime-error', 'automated'];
const manualIssueLabels = ['user-report'];
const SUPPORT_EMAIL = 'eliogerges@xp3rinc.com';
const GUIDE_FILENAME = 'XP3R Invoice Merger.docx';
const REPORT_ISSUE_EVENT = 'app:report-issue';

const resolveGuidePath = () => {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'out', GUIDE_FILENAME);
    }
    return path.join(process.cwd(), 'public', GUIDE_FILENAME);
};

const openSupportResource = async (type: 'guide' | 'email') => {
    if (type === 'guide') {
        const guidePath = resolveGuidePath();
        const result = await shell.openPath(guidePath);
        if (result) {
            throw new Error(result);
        }
        return;
    }

    await shell.openExternal(`mailto:${SUPPORT_EMAIL}?subject=Invoice%20Merger%20Support`);
};

const buildIssueBody = (error: Error, source: string) => {
    const lines = [
        `A runtime error occurred in the Electron main process.`,
        '',
        `**Source**: ${source}`,
        `**App Version**: ${app.getVersion()}`,
        `**Platform**: ${process.platform} ${process.arch}`,
        '',
        '```text',
        error.stack || error.message || String(error),
        '```',
    ];
    return lines.join('\n');
};

const reportRuntimeIssue = async (error: Error, source: string) => {
    const token = process.env.GITHUB_RUNTIME_TOKEN || process.env.GITHUB_TOKEN;

    if (!token) {
        log.warn('Skipping runtime issue creation: GITHUB_RUNTIME_TOKEN not configured.');
        return;
    }

    try {
        const octokit = new Octokit({ auth: token });
        const title = `Runtime error (${source}): ${error.message.substring(0, 80) || 'Unknown error'}`;

        await octokit.rest.issues.create({
            owner: issueRepo.owner,
            repo: issueRepo.name,
            title,
            body: buildIssueBody(error, source),
            labels: issueLabels,
        });
        log.info('Created GitHub issue for runtime error.');
    } catch (issueError) {
        log.error('Failed to create runtime issue:', issueError);
    }
};

const handleFatalError = (error: unknown, source: string) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    log.error(`Unhandled runtime error (${source}):`, normalized);
    void reportRuntimeIssue(normalized, source);
};

const reportUserIssue = async (payload: {
    title: string;
    description?: string;
    includeLogs?: boolean;
}) => {
    const token = process.env.GITHUB_RUNTIME_TOKEN || process.env.GITHUB_TOKEN;

    if (!token) {
        log.warn('GITHUB_RUNTIME_TOKEN not set. User issue report will not be sent.');
        return;
    }

    const octokit = new Octokit({ auth: token });
    const logFilePath =
        payload.includeLogs && log.transports.file && 'getFile' in log.transports.file
            ? (log.transports.file as unknown as { getFile: () => { path: string } }).getFile().path
            : undefined;

    const bodyLines = [
        'User submitted an issue from the app UI.',
        '',
        `**App Version**: ${app.getVersion()}`,
        `**Platform**: ${process.platform} ${process.arch}`,
        '',
        payload.description || '_No description provided._',
    ];

    if (logFilePath) {
        bodyLines.push('', `Logs: ${logFilePath}`);
    }

    await octokit.rest.issues.create({
        owner: issueRepo.owner,
        repo: issueRepo.name,
        title: payload.title || 'User issue report',
        body: bodyLines.join('\n'),
        labels: manualIssueLabels,
    });
};

const sendReportIssueEvent = () => {
    if (mainWindow) {
        mainWindow.webContents.send(REPORT_ISSUE_EVENT);
    }
};

const buildApplicationMenu = () => {
    const isMac = process.platform === 'darwin';
    const template: MenuItemConstructorOptions[] = [];

    if (isMac) {
        template.push({
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        });
    }

    const fileSubmenu: MenuItemConstructorOptions[] = isMac ? [{ role: 'close' }] : [{ role: 'quit' }];
    template.push({
        label: 'File',
        submenu: fileSubmenu,
    });

    const editSubmenu: MenuItemConstructorOptions[] = [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
    ];
    if (isMac) {
        editSubmenu.push(
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
        );
    } else {
        editSubmenu.push({ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' });
    }
    template.push({
        label: 'Edit',
        submenu: editSubmenu,
    });

    const viewSubmenu: MenuItemConstructorOptions[] = [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
    ];
    template.push({
        label: 'View',
        submenu: viewSubmenu,
    });

    const windowSubmenu: MenuItemConstructorOptions[] = [{ role: 'minimize' }, { role: 'zoom' }];
    if (isMac) {
        windowSubmenu.push({ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' });
    } else {
        windowSubmenu.push({ role: 'close' });
    }
    template.push({
        label: 'Window',
        submenu: windowSubmenu,
    });

    const helpSubmenu: MenuItemConstructorOptions[] = [
        {
            label: 'User Guide',
            click: () => {
                void openSupportResource('guide').catch((error) => log.error('Failed to open guide:', error));
            },
        },
        {
            label: 'Contact Support',
            click: () => {
                void openSupportResource('email').catch((error) => log.error('Failed to open email:', error));
            },
        },
        { type: 'separator' },
        {
            label: 'Report Issue…',
            click: () => sendReportIssueEvent(),
        },
    ];
    template.push({
        label: 'Help',
        submenu: helpSubmenu,
    });

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

process.on('uncaughtException', (error) => {
    handleFatalError(error, 'uncaughtException');
});

process.on('unhandledRejection', (reason) => {
    handleFatalError(reason instanceof Error ? reason : new Error(String(reason)), 'unhandledRejection');
});

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

    buildApplicationMenu();
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

ipcMain.handle(IPC_CHANNELS.REPORT_ISSUE, async (_, payload) => {
    try {
        const parsed = ReportIssuePayloadSchema.parse(payload);
        await reportUserIssue(parsed);
        return true;
    } catch (error) {
        log.error('Failed to submit user issue:', error);
        throw error;
    }
});

ipcMain.handle(IPC_CHANNELS.OPEN_SUPPORT_LINK, async (_, type: 'guide' | 'email') => {
    try {
        await openSupportResource(type);
        return true;
    } catch (error) {
        log.error('Failed to open support link:', error);
        throw error;
    }
});