import { contextBridge, ipcRenderer } from 'electron';
import type {
    ScanRequest,
    ScanResponse,
    GetInvoiceCandidatesRequest,
    GetInvoiceCandidatesResponse,
    MergeRequest,
    MergeResponse,
} from './ipc/types';
import { IPC_CHANNELS } from './ipc/types';

/**
 * Secure IPC bridge between renderer and main process
 */
const api = {
    /**
     * Scan for clients and periods
     */
    scan: async (request: ScanRequest): Promise<ScanResponse> => {
        return ipcRenderer.invoke(IPC_CHANNELS.SCAN, request);
    },

    /**
     * Get invoice candidates for a specific client/period
     */
    getInvoiceCandidates: async (
        request: GetInvoiceCandidatesRequest
    ): Promise<GetInvoiceCandidatesResponse> => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_INVOICE_CANDIDATES, request);
    },

    /**
     * Merge invoice + backups for multiple jobs
     */
    merge: async (request: MergeRequest): Promise<MergeResponse> => {
        return ipcRenderer.invoke(IPC_CHANNELS.MERGE, request);
    },

    /**
     * Show native folder picker dialog
     */
    pickOutputDir: async (): Promise<string | null> => {
        return ipcRenderer.invoke(IPC_CHANNELS.PICK_OUTPUT_DIR);
    },
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declarations for the renderer process
export type ElectronAPI = typeof api;

