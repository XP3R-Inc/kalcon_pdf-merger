// Extended types for UI state management
import type { FileInfo } from '../../electron/ipc/types';

export interface BackupFolder {
    path: string;
    name: string;
    files: FileInfo[];
    selected: boolean;
    depth?: number;
    parent?: string | null;
    fullPath?: string;
}

export interface SelectedInvoiceJob {
    clientName: string;
    clientPath: string;
    fiscalYear: string;
    month: string;
    invoiceFile: FileInfo;
    backupFiles: FileInfo[];
}

