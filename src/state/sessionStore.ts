import { create } from 'zustand';
import type { ClientPeriod } from '../../electron/ipc/types';

/**
 * Generate a unique key for a client/period combination
 */
function getClientKey(client: ClientPeriod): string {
    return `${client.clientName}-${client.fiscalYear}-${client.month}`;
}

/**
 * Session state for the application
 * Stores user selections and temporary data while app is running
 */
interface SessionState {
    // Base path
    basePath: string | null;
    setBasePath: (path: string | null) => void;

    // Period selection
    fiscalYear: string | null;
    month: string | null;
    setFiscalYear: (fy: string | null) => void;
    setMonth: (month: string | null) => void;

    // Scanned clients
    clients: ClientPeriod[];
    setClients: (clients: ClientPeriod[]) => void;

    // Selected clients for batch processing
    selectedClients: Set<string>;
    toggleClient: (clientKey: string) => void;
    selectAllClients: () => void;
    deselectAllClients: () => void;

    // Backup selections per client (clientKey -> Set of backup paths)
    backupSelections: Map<string, Set<string>>;
    setBackupsForClient: (clientKey: string, backupPaths: string[]) => void;
    toggleBackup: (clientKey: string, backupPath: string) => void;

    // Invoice selections (when multiple candidates exist)
    invoiceSelections: Map<string, string>;
    setInvoiceForClient: (clientKey: string, invoicePath: string) => void;

    // Filters
    filters: {
        clientFilter: string;
        invoiceFilter: string;
        expenseFilter: string;
        showAllClients: boolean;
    };
    setFilter: (key: keyof SessionState['filters'], value: string | boolean) => void;

    // Output settings
    outputMode: 'client-folder' | 'custom-folder';
    customOutputPath: string | null;
    setOutputMode: (mode: 'client-folder' | 'custom-folder') => void;
    setCustomOutputPath: (path: string | null) => void;

    // Reset everything
    reset: () => void;
}

const initialFilters = {
    clientFilter: '',
    invoiceFilter: '',
    expenseFilter: '',
    showAllClients: false,
};

export const useSessionStore = create<SessionState>((set) => ({
    basePath: null,
    setBasePath: (path) => set({ basePath: path }),

    fiscalYear: null,
    month: null,
    setFiscalYear: (fy) => set({ fiscalYear: fy }),
    setMonth: (month) => set({ month: month }),

    clients: [],
    setClients: (clients) => set({ clients }),

    selectedClients: new Set(),
    toggleClient: (clientKey) =>
        set((state) => {
            const newSet = new Set(state.selectedClients);
            if (newSet.has(clientKey)) {
                newSet.delete(clientKey);
            } else {
                newSet.add(clientKey);
            }
            return { selectedClients: newSet };
        }),
    selectAllClients: () =>
        set((state) => ({
            selectedClients: new Set(state.clients.map((c) => getClientKey(c))),
        })),
    deselectAllClients: () => set({ selectedClients: new Set() }),

    backupSelections: new Map(),
    setBackupsForClient: (clientKey, backupPaths) =>
        set((state) => {
            const newMap = new Map(state.backupSelections);
            newMap.set(clientKey, new Set(backupPaths));
            return { backupSelections: newMap };
        }),
    toggleBackup: (clientKey, backupPath) =>
        set((state) => {
            const newMap = new Map(state.backupSelections);
            const current = newMap.get(clientKey) || new Set();
            const newSet = new Set(current);
            if (newSet.has(backupPath)) {
                newSet.delete(backupPath);
            } else {
                newSet.add(backupPath);
            }
            newMap.set(clientKey, newSet);
            return { backupSelections: newMap };
        }),

    invoiceSelections: new Map(),
    setInvoiceForClient: (clientKey, invoicePath) =>
        set((state) => {
            const newMap = new Map(state.invoiceSelections);
            newMap.set(clientKey, invoicePath);
            return { invoiceSelections: newMap };
        }),

    filters: initialFilters,
    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        })),

    outputMode: 'client-folder',
    customOutputPath: null,
    setOutputMode: (mode) => set({ outputMode: mode }),
    setCustomOutputPath: (path) => set({ customOutputPath: path }),

    reset: () =>
        set({
            basePath: null,
            fiscalYear: null,
            month: null,
            clients: [],
            selectedClients: new Set(),
            backupSelections: new Map(),
            invoiceSelections: new Map(),
            filters: initialFilters,
            outputMode: 'client-folder',
            customOutputPath: null,
        }),
}));

export { getClientKey };
