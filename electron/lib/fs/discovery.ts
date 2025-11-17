import fs from 'fs/promises';
import path from 'path';
import type { ScanRequest, ClientPeriod, FileInfo } from '../../ipc/types';

/**
 * Recursively find all PDF and image files in a directory
 */
async function findBackupFiles(dir: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];

    async function walk(currentDir: string) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (allowedExtensions.includes(ext)) {
                        const stats = await fs.stat(fullPath);
                        files.push({
                            path: fullPath,
                            name: entry.name,
                            size: stats.size,
                            modifiedTime: stats.mtimeMs,
                        });
                    }
                }
            }
        } catch (error) {
            // Silently skip directories we can't access
            console.warn(`Cannot read directory ${currentDir}:`, error);
        }
    }

    await walk(dir);
    return files.sort((a, b) => b.modifiedTime - a.modifiedTime);
}

/**
 * Find the newest PDF in a directory (non-recursive)
 */
async function findNewestInvoice(dir: string): Promise<FileInfo | null> {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const pdfs: FileInfo[] = [];

        for (const entry of entries) {
            if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf') {
                const fullPath = path.join(dir, entry.name);
                const stats = await fs.stat(fullPath);
                pdfs.push({
                    path: fullPath,
                    name: entry.name,
                    size: stats.size,
                    modifiedTime: stats.mtimeMs,
                });
            }
        }

        if (pdfs.length === 0) return null;

        // Sort by modified time descending and return newest
        pdfs.sort((a, b) => b.modifiedTime - a.modifiedTime);
        return pdfs[0];
    } catch (error) {
        return null;
    }
}

/**
 * Get all invoice candidates for a client/period
 */
export async function getInvoiceCandidatesForClient(
    clientPath: string,
    fiscalYear: string,
    month: string
): Promise<FileInfo[]> {
    const invoiceDir = path.join(
        clientPath,
        'Invoices',
        `FY${fiscalYear}`,
        month,
        'Invoice'
    );

    try {
        const entries = await fs.readdir(invoiceDir, { withFileTypes: true });
        const candidates: FileInfo[] = [];

        for (const entry of entries) {
            if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf') {
                const fullPath = path.join(invoiceDir, entry.name);
                const stats = await fs.stat(fullPath);
                candidates.push({
                    path: fullPath,
                    name: entry.name,
                    size: stats.size,
                    modifiedTime: stats.mtimeMs,
                });
            }
        }

        return candidates.sort((a, b) => b.modifiedTime - a.modifiedTime);
    } catch (error) {
        return [];
    }
}

/**
 * Check if a string matches a filter (supports basic text or regex)
 */
function matchesFilter(value: string, filter?: string): boolean {
    if (!filter) return true;

    // Try as regex first
    try {
        const regex = new RegExp(filter, 'i');
        return regex.test(value);
    } catch {
        // Fall back to case-insensitive text match
        return value.toLowerCase().includes(filter.toLowerCase());
    }
}

/**
 * Parse fiscal year and month from directory name
 * Expected format: MM-YY (e.g., 04-25 for April 2025)
 */
function parseMonthDir(dirName: string): { month: string; year: string } | null {
    const match = dirName.match(/^(\d{2})-(\d{2})$/);
    if (!match) return null;
    return { month: match[1], year: match[2] };
}

/**
 * Scan a client directory for matching periods
 */
async function scanClientForPeriods(
    clientPath: string,
    clientName: string,
    targetFy?: string,
    targetMonth?: string,
    filters?: ScanRequest['filters']
): Promise<ClientPeriod[]> {
    const periods: ClientPeriod[] = [];
    const invoicesPath = path.join(clientPath, 'Invoices');

    // Apply client filter
    if (filters?.clientFilter && !matchesFilter(clientName, filters.clientFilter)) {
        return [];
    }

    try {
        await fs.access(invoicesPath);
        const fyDirs = await fs.readdir(invoicesPath, { withFileTypes: true });

        for (const fyDir of fyDirs) {
            if (!fyDir.isDirectory()) continue;

            // Parse FY directory (e.g., FY25)
            const fyMatch = fyDir.name.match(/^FY(\d{2})$/);
            if (!fyMatch) continue;

            const fy = fyMatch[1];
            if (targetFy && fy !== targetFy) continue;

            const fyPath = path.join(invoicesPath, fyDir.name);
            const monthDirs = await fs.readdir(fyPath, { withFileTypes: true });

            for (const monthDir of monthDirs) {
                if (!monthDir.isDirectory()) continue;

                const parsed = parseMonthDir(monthDir.name);
                if (!parsed) continue;
                if (targetMonth && monthDir.name !== targetMonth) continue;

                const monthPath = path.join(fyPath, monthDir.name);
                const invoicePath = path.join(monthPath, 'Invoice');
                const backupPath = path.join(monthPath, 'Expense Backup');

                // Check if required directories exist
                try {
                    await fs.access(invoicePath);
                } catch {
                    continue; // Skip if Invoice folder doesn't exist
                }

                // Get invoice file
                const invoiceFile = await findNewestInvoice(invoicePath);

                // Apply invoice filter
                if (filters?.invoiceFilter && invoiceFile) {
                    if (!matchesFilter(invoiceFile.name, filters.invoiceFilter)) {
                        continue;
                    }
                }

                // Get backup files
                let backupFiles: FileInfo[] = [];
                try {
                    await fs.access(backupPath);
                    backupFiles = await findBackupFiles(backupPath);

                    // Apply expense filter
                    if (filters?.expenseFilter) {
                        backupFiles = backupFiles.filter((file) =>
                            matchesFilter(file.name, filters.expenseFilter)
                        );
                    }
                } catch {
                    // Backup folder doesn't exist, continue anyway
                }

                periods.push({
                    clientName,
                    clientPath,
                    fiscalYear: fy,
                    month: monthDir.name,
                    invoicePath,
                    backupPath,
                    invoiceFile,
                    backupFiles,
                });
            }
        }
    } catch (error) {
        // Client doesn't have Invoices folder or can't be accessed
        return [];
    }

    return periods;
}

/**
 * Scan base directory for all clients and matching periods
 */
export async function scanForClients(request: ScanRequest): Promise<ClientPeriod[]> {
    const allPeriods: ClientPeriod[] = [];

    try {
        const entries = await fs.readdir(request.basePath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const clientPath = path.join(request.basePath, entry.name);
                const periods = await scanClientForPeriods(
                    clientPath,
                    entry.name,
                    request.fy,
                    request.month,
                    request.filters
                );
                allPeriods.push(...periods);
            }
        }
    } catch (error) {
        throw new Error(`Cannot scan base path: ${error instanceof Error ? error.message : String(error)}`);
    }

    return allPeriods;
}

