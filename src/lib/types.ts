// Extended types for UI state management
import type { ClientPeriod, FileInfo } from '../../electron/ipc/types';

export interface ExtendedClientPeriod extends ClientPeriod {
    // Selected invoice (when multiple exist)
    selectedInvoice?: FileInfo;
    // Invoice candidates (when multiple exist)
    invoiceCandidates?: FileInfo[];
    // Selected backup files
    selectedBackups: string[];
    // Organized backups by subfolder
    backupsByFolder: Map<string, FileInfo[]>;
}

export interface BackupFolder {
    path: string;
    name: string;
    files: FileInfo[];
    selected: boolean;
    depth?: number;
    parent?: string | null;
    fullPath?: string;
}

