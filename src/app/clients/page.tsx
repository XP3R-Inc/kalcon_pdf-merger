'use client';

import { useState, useEffect } from 'react';
import type { ClientPeriod, FileInfo } from '../../../electron/ipc/types';
import StepIndicator from '../../components/StepIndicator';
import Sidebar from '../../components/Sidebar';
import FolderTree, { buildFolderTree } from '../../components/FolderTree';
import { navigateToPage } from '../../lib/router';

interface TreeFolder {
    name: string;
    path: string;
    files: FileInfo[];
    subfolders: TreeFolder[];
    depth: number;
}

interface InvoiceSelection {
    invoice: FileInfo;
    selectedBackupPaths: Set<string>;
}

interface ExtendedClient extends ClientPeriod {
    invoiceCandidates?: FileInfo[];
    invoiceSelections: InvoiceSelection[];
    folderTree: TreeFolder[];
}

const findFolderByPath = (folders: TreeFolder[], targetPath: string): TreeFolder | null => {
    for (const folder of folders) {
        if (folder.path === targetPath) {
            return folder;
        }
        const found = findFolderByPath(folder.subfolders, targetPath);
        if (found) {
            return found;
        }
    }
    return null;
};

const collectFilesFromFolder = (folder: TreeFolder): FileInfo[] => {
    const files: FileInfo[] = [...folder.files];
    folder.subfolders.forEach((sub) => {
        files.push(...collectFilesFromFolder(sub));
    });
    return files;
};

const collectFilesFromTree = (folders: TreeFolder[], folderPath: string): FileInfo[] => {
    const targetFolder = findFolderByPath(folders, folderPath);
    if (!targetFolder) {
        return [];
    }
    return collectFilesFromFolder(targetFolder);
};

export default function ClientsPage() {
    const [clients, setClients] = useState<ExtendedClient[]>([]);
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
    const [filters, setFilters] = useState({
        client: '',
        invoice: '',
        expense: '',
        showAll: false,
    });
    const [invoiceDrafts, setInvoiceDrafts] = useState<Record<string, string>>({});
    const [loadingInvoices, setLoadingInvoices] = useState<Record<string, boolean>>({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarContext, setSidebarContext] = useState<{ clientKey: string; invoicePath: string } | null>(null);
    const [sidebarSearch, setSidebarSearch] = useState('');

    const steps = [
        { number: 1, label: 'Base Folder', status: 'completed' as const },
        { number: 2, label: 'Select Period', status: 'completed' as const },
        { number: 3, label: 'Choose Clients', status: 'active' as const },
        { number: 4, label: 'Merge', status: 'inactive' as const },
    ];

    useEffect(() => {
        const stored = sessionStorage.getItem('clients');
        if (!stored || stored === 'undefined') {
            window.alert('We need to re-run the period selection step before choosing clients.');
            navigateToPage('/period');
            return;
        }

        let parsed: ClientPeriod[];
        try {
            parsed = JSON.parse(stored);
        } catch (error) {
            console.error('Failed to parse cached clients payload:', error);
            sessionStorage.removeItem('clients');
            window.alert('Your previous client selection data was invalid. Please re-run the period selection step.');
            navigateToPage('/period');
            return;
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
            window.alert('No clients were found for the last period scan. Please select a period again.');
            navigateToPage('/period');
            return;
        }

        // Initialize extended clients with backup folders and tree
        const extended: ExtendedClient[] = parsed.map((client) => {
            const folderTree = buildFolderTree(client.backupFiles, client.backupPath);
            const initialSelections: InvoiceSelection[] = [];

            if (client.invoiceFile) {
                const defaultSelectedPaths = new Set<string>();
                client.backupFiles.forEach((file) => defaultSelectedPaths.add(file.path));
                initialSelections.push({
                    invoice: client.invoiceFile,
                    selectedBackupPaths: defaultSelectedPaths,
                });
            }

            return {
                ...client,
                invoiceSelections: initialSelections,
                folderTree,
            };
        });

        setClients(extended);

        // Auto-select clients with invoices by default
        const autoSelected = new Set<string>();
        extended.forEach((client) => {
            if (client.invoiceSelections.length > 0) {
                autoSelected.add(getClientKey(client));
            }
        });
        setSelectedClients(autoSelected);
    }, []);

    const getClientKey = (client: ClientPeriod) => {
        return `${client.clientName}-${client.fiscalYear}-${client.month}`;
    };

    const toggleClient = (client: ExtendedClient) => {
        const key = getClientKey(client);
        const newSet = new Set(selectedClients);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setSelectedClients(newSet);
    };

    const selectAll = () => {
        const allKeys = new Set(filteredClients.map(getClientKey));
        setSelectedClients(allKeys);
    };

    const deselectAll = () => {
        setSelectedClients(new Set());
    };

    const ensureInvoiceCandidates = async (client: ExtendedClient): Promise<FileInfo[]> => {
        if (client.invoiceCandidates) {
            return client.invoiceCandidates;
        }

        if (typeof window === 'undefined' || !window.electronAPI) {
            return [];
        }

        const key = getClientKey(client);
        setLoadingInvoices((prev) => ({ ...prev, [key]: true }));

        try {
            const result = await window.electronAPI.getInvoiceCandidates({
                clientPath: client.clientPath,
                fiscalYear: client.fiscalYear,
                month: client.month,
            });

            setClients((prev) =>
                prev.map((c) =>
                    getClientKey(c) === key
                        ? {
                              ...c,
                              invoiceCandidates: result.candidates,
                          }
                        : c
                )
            );

            return result.candidates;
        } catch (error) {
            console.error('Failed to get invoice candidates:', error);
            return [];
        } finally {
            setLoadingInvoices((prev) => ({ ...prev, [key]: false }));
        }
    };

    const addInvoiceSelection = async (client: ExtendedClient, invoicePath: string) => {
        const key = getClientKey(client);
        const candidates = await ensureInvoiceCandidates(client);
        const invoice = candidates.find((f) => f.path === invoicePath);

        if (!invoice) {
            return;
        }

        setClients((prev) =>
            prev.map((c) => {
                if (getClientKey(c) !== key) return c;
                if (c.invoiceSelections.some((sel) => sel.invoice.path === invoicePath)) {
                    return c;
                }
                const defaultPaths = new Set<string>();
                c.backupFiles.forEach((file) => defaultPaths.add(file.path));
                return {
                    ...c,
                    invoiceSelections: [
                        ...c.invoiceSelections,
                        {
                            invoice,
                            selectedBackupPaths: defaultPaths,
                        },
                    ],
                };
            })
        );

        setInvoiceDrafts((prev) => ({ ...prev, [key]: '' }));

        setSelectedClients((prev) => {
            if (prev.has(key)) {
                return prev;
            }
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    };

    const removeInvoiceSelection = (client: ExtendedClient, invoicePath: string) => {
        const key = getClientKey(client);
        const remainingSelections = client.invoiceSelections.filter((sel) => sel.invoice.path !== invoicePath);

        setClients((prev) =>
            prev.map((c) => {
                if (getClientKey(c) !== key) return c;
                return {
                    ...c,
                    invoiceSelections: remainingSelections,
                };
            })
        );

        if (remainingSelections.length === 0) {
            setSelectedClients((prev) => {
                if (!prev.has(key)) return prev;
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }

        setSidebarContext((prev) => {
            if (prev && prev.clientKey === key && prev.invoicePath === invoicePath) {
                return null;
            }
            return prev;
        });
    };

    // Open sidebar for backup selection per invoice
    const openBackupSidebar = (client: ExtendedClient, invoicePath: string) => {
        setSidebarContext({
            clientKey: getClientKey(client),
            invoicePath,
        });
        setSidebarSearch('');
        setSidebarOpen(true);
    };

    // Toggle folder selection (recursive for tree)
    const toggleFolder = (folderPath: string) => {
        if (!sidebarContext) return;

        const { clientKey, invoicePath } = sidebarContext;
        setClients((prev) =>
            prev.map((client) => {
                if (getClientKey(client) !== clientKey) return client;

                const filesInFolder = collectFilesFromTree(client.folderTree, folderPath);
                if (filesInFolder.length === 0) return client;

                const updatedSelections = client.invoiceSelections.map((selection) => {
                    if (selection.invoice.path !== invoicePath) return selection;
                    const newBackupPaths = new Set(selection.selectedBackupPaths);
                    const allSelected = filesInFolder.every((file) => newBackupPaths.has(file.path));

                    if (allSelected) {
                        filesInFolder.forEach((file) => newBackupPaths.delete(file.path));
                    } else {
                        filesInFolder.forEach((file) => newBackupPaths.add(file.path));
                    }

                    return {
                        ...selection,
                        selectedBackupPaths: newBackupPaths,
                    };
                });

                return {
                    ...client,
                    invoiceSelections: updatedSelections,
                };
            })
        );
    };

    // Toggle individual file
    const toggleFile = (filePath: string) => {
        if (!sidebarContext) return;

        const { clientKey, invoicePath } = sidebarContext;
        setClients((prev) =>
            prev.map((client) => {
                if (getClientKey(client) !== clientKey) return client;

                const updatedSelections = client.invoiceSelections.map((selection) => {
                    if (selection.invoice.path !== invoicePath) return selection;
                    const newBackupPaths = new Set(selection.selectedBackupPaths);
                    if (newBackupPaths.has(filePath)) {
                        newBackupPaths.delete(filePath);
                    } else {
                        newBackupPaths.add(filePath);
                    }
                    return {
                        ...selection,
                        selectedBackupPaths: newBackupPaths,
                    };
                });

                return {
                    ...client,
                    invoiceSelections: updatedSelections,
                };
            })
        );
    };

    const handleContinue = () => {
        const selectedJobs = clients
            .filter((client) => selectedClients.has(getClientKey(client)))
            .flatMap((client) =>
                client.invoiceSelections.map((selection) => ({
                    clientName: client.clientName,
                    clientPath: client.clientPath,
                    fiscalYear: client.fiscalYear,
                    month: client.month,
                    invoiceFile: selection.invoice,
                    backupFiles: client.backupFiles.filter((file) => selection.selectedBackupPaths.has(file.path)),
                }))
            )
            .filter((job) => job.invoiceFile);

        if (selectedJobs.length === 0) {
            alert('Please select at least one invoice to continue');
            return;
        }

        sessionStorage.setItem('selectedClients', JSON.stringify(selectedJobs));
        navigateToPage('/merge');
    };

    // Apply filters
    const filteredClients = clients.filter((client) => {
        const hasInvoiceSelections = client.invoiceSelections.length > 0;

        if (!filters.showAll && !hasInvoiceSelections) {
            return false;
        }

        if (filters.client && !client.clientName.toLowerCase().includes(filters.client.toLowerCase())) {
            return false;
        }

        if (filters.invoice) {
            const invoiceMatch = client.invoiceSelections.some((selection) =>
                selection.invoice.name.toLowerCase().includes(filters.invoice.toLowerCase())
            );
            if (!invoiceMatch) {
                return false;
            }
        }

        if (filters.expense) {
            const expenseMatch = client.invoiceSelections.some((selection) =>
                Array.from(selection.selectedBackupPaths).some((path) => {
                    const file = client.backupFiles.find((f) => f.path === path);
                    return file && file.name.toLowerCase().includes(filters.expense.toLowerCase());
                })
            );
            if (!expenseMatch) {
                return false;
            }
        }

        return true;
    });

    const totalSelectedInvoices = clients.reduce((count, client) => {
        if (!selectedClients.has(getClientKey(client))) {
            return count;
        }
        return count + client.invoiceSelections.length;
    }, 0);

    const sidebarClient = sidebarContext
        ? clients.find((client) => getClientKey(client) === sidebarContext.clientKey)
        : null;
    const sidebarSelection = sidebarClient?.invoiceSelections.find(
        (selection) => selection.invoice.path === sidebarContext?.invoicePath
    );

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                <div className="card">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold" style={{
                                background: 'linear-gradient(135deg, #2596be 0%, #00b2c8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                Select Clients
                            </h1>
                            <p className="text-gray-600 mt-1">Choose clients and configure their settings</p>
                        </div>
                        <button
                            onClick={() => navigateToPage('/period')}
                            className="btn btn-secondary"
                        >
                            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                    </div>

                    {/* Steps */}
                    <StepIndicator steps={steps} />

                    {/* Filters */}
                    <div className="filter-section mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filters
                            </h3>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.showAll}
                                    onChange={(e) => setFilters({ ...filters, showAll: e.target.checked })}
                                    className="checkbox"
                                />
                                <span className="text-sm font-medium text-gray-700">Show clients without invoices</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Client Name
                                </label>
                                <input
                                    type="text"
                                    value={filters.client}
                                    onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                                    placeholder="Filter by client..."
                                    className="input bg-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Invoice File
                                </label>
                                <input
                                    type="text"
                                    value={filters.invoice}
                                    onChange={(e) => setFilters({ ...filters, invoice: e.target.value })}
                                    placeholder="Filter by invoice..."
                                    className="input bg-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expense File
                                </label>
                                <input
                                    type="text"
                                    value={filters.expense}
                                    onChange={(e) => setFilters({ ...filters, expense: e.target.value })}
                                    placeholder="Filter by expense..."
                                    className="input bg-white text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Selection Actions */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-600 flex gap-4">
                            <span>
                                <span className="font-semibold text-gray-900">{selectedClients.size}</span> / {filteredClients.length} clients
                            </span>
                            <span>
                                <span className="font-semibold text-gray-900">{totalSelectedInvoices}</span> invoice
                                {totalSelectedInvoices === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={selectAll} className="btn btn-sm btn-secondary">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Select All
                            </button>
                            <button onClick={deselectAll} className="btn btn-sm btn-secondary">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Deselect All
                            </button>
                        </div>
                    </div>

                    {/* Client Cards */}
                    <div className="space-y-4 mb-6">
                        {filteredClients.map((client) => {
                            const key = getClientKey(client);
                            const isSelected = selectedClients.has(key);
                            const selectedPaths = client.invoiceSelections.map((sel) => sel.invoice.path);
                            const availableInvoices = (client.invoiceCandidates ?? []).filter(
                                (inv) => !selectedPaths.includes(inv.path)
                            );
                            const draftValue = invoiceDrafts[key] ?? '';
                            const isLoadingInvoices = Boolean(loadingInvoices[key]);

                            return (
                                <div
                                    key={key}
                                    className={`border rounded-2xl p-4 shadow-sm bg-white transition-all ${
                                        isSelected ? 'ring-2 ring-blue-200 shadow-md' : ''
                                    }`}
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleClient(client)}
                                                className="checkbox mt-1"
                                            />
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {client.clientName}
                                                    </h3>
                                                    <span className="badge badge-info text-xs">
                                                        FY{client.fiscalYear} {client.month}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {client.invoiceSelections.length} invoice
                                                    {client.invoiceSelections.length === 1 ? '' : 's'} selected
                                                </p>
                                            </div>
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="badge badge-info bg-blue-100 text-blue-800">
                                                {client.invoiceSelections.length} configuration
                                                {client.invoiceSelections.length === 1 ? '' : 's'}
                                            </span>
                                            <span className="badge badge-info bg-emerald-100 text-emerald-700">
                                                {client.backupFiles.length} backup file
                                                {client.backupFiles.length === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                        {client.invoiceSelections.length > 0 ? (
                                            client.invoiceSelections.map((selection) => (
                                                <div
                                                    key={selection.invoice.path}
                                                    className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                                                >
                                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{selection.invoice.name}</p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {selection.selectedBackupPaths.size} backup
                                                                {selection.selectedBackupPaths.size === 1 ? '' : 's'} selected
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openBackupSidebar(client, selection.invoice.path)}
                                                                className="btn btn-sm btn-secondary"
                                                            >
                                                                Configure Backups
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeInvoiceSelection(client, selection.invoice.path)}
                                                                className="btn btn-sm btn-secondary"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                                                No invoices selected yet.
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-5 border-t pt-4 space-y-2">
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                            Add another invoice
                                        </label>
                                        {client.invoiceCandidates || isLoadingInvoices ? (
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <select
                                                    value={draftValue}
                                                    disabled={isLoadingInvoices || availableInvoices.length === 0}
                                                    onChange={(e) =>
                                                        setInvoiceDrafts((prev) => ({ ...prev, [key]: e.target.value }))
                                                    }
                                                    onFocus={() => ensureInvoiceCandidates(client)}
                                                    className="input text-sm bg-white flex-1"
                                                >
                                                    <option value="">
                                                        {isLoadingInvoices
                                                            ? 'Loading invoices...'
                                                            : availableInvoices.length === 0
                                                                ? 'No additional invoices'
                                                                : 'Select invoice'}
                                                    </option>
                                                    {availableInvoices.map((inv) => (
                                                        <option key={inv.path} value={inv.path}>
                                                            {inv.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    disabled={!draftValue}
                                                    onClick={() => {
                                                        if (!draftValue) return;
                                                        addInvoiceSelection(client, draftValue);
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => ensureInvoiceCandidates(client)}
                                                className="btn btn-sm btn-secondary w-full"
                                            >
                                                Load invoice list
                                            </button>
                                        )}
                                        {client.invoiceCandidates && (
                                            <button
                                                type="button"
                                                className="text-xs text-blue-600 hover:underline"
                                                onClick={() => ensureInvoiceCandidates(client)}
                                            >
                                                Refresh list
                                            </button>
                                        )}
                                        {client.invoiceCandidates && availableInvoices.length === 0 && (
                                            <p className="text-xs text-gray-500">
                                                All invoices for this client are already selected.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredClients.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-xl mb-6">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-600 font-medium">No clients match your filters</p>
                            <p className="text-sm text-gray-500 mt-1">Try adjusting your filter criteria</p>
                        </div>
                    )}

                    {/* Continue Button */}
                    <button
                        onClick={handleContinue}
                        className="btn btn-primary w-full py-4 text-lg font-semibold"
                        disabled={totalSelectedInvoices === 0}
                    >
                        Continue to Merge ({totalSelectedInvoices} invoice{totalSelectedInvoices === 1 ? '' : 's'})
                        <svg className="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Backup Selection Sidebar */}
            <Sidebar
                isOpen={sidebarOpen && !!(sidebarClient && sidebarSelection)}
                onClose={() => {
                    setSidebarOpen(false);
                    setSidebarContext(null);
                }}
                title={
                    sidebarClient && sidebarSelection
                        ? `Configure ${sidebarClient.clientName} • ${sidebarSelection.invoice.name}`
                        : 'Configure Backups'
                }
            >
                {sidebarClient && sidebarSelection ? (
                    <div className="space-y-6">
                        {/* Summary */}
                        <div
                            className="p-4 rounded-lg"
                            style={{
                                background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.05) 0%, rgba(0, 178, 200, 0.05) 100%)',
                                border: '1px solid rgba(37, 150, 190, 0.2)',
                            }}
                        >
                            <h3 className="font-semibold text-gray-900 mb-2">Selection Summary</h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Files:</span>
                                    <span className="font-medium text-gray-900">{sidebarClient.backupFiles.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Selected:</span>
                                    <span className="font-medium text-green-600">{sidebarSelection.selectedBackupPaths.size}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Folders:</span>
                                    <span className="font-medium text-gray-900">{sidebarClient.folderTree.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search Expense Backups
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={sidebarSearch}
                                    onChange={(e) => setSidebarSearch(e.target.value)}
                                    placeholder="Type a folder or file name..."
                                    className="input bg-white text-sm flex-1"
                                />
                                {sidebarSearch && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setSidebarSearch('')}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Folder Tree */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-gray-900">Expense Backup Files</h3>
                                <span className="text-sm text-gray-600">
                                    {sidebarSelection.selectedBackupPaths.size} / {sidebarClient.backupFiles.length} selected
                                </span>
                            </div>

                            <div className="text-xs text-gray-600 mb-3 p-2 bg-blue-50 rounded flex items-start gap-2">
                                <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    Navigate the folder tree, or use search to filter down to specific files quickly.
                                </span>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-3 bg-white max-h-96 overflow-y-auto">
                                <FolderTree
                                    folders={sidebarClient.folderTree}
                                    selectedPaths={sidebarSelection.selectedBackupPaths}
                                    onToggleFolder={toggleFolder}
                                    onToggleFile={toggleFile}
                                    filterQuery={sidebarSearch}
                                />
                            </div>

                            {/* Empty State */}
                            {sidebarClient.folderTree.length === 0 && (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    <p className="text-gray-600 font-medium">No backup files found</p>
                                    <p className="text-sm text-gray-500 mt-1">This client has no expense backups</p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!sidebarClient || !sidebarSelection) return;
                                    const key = getClientKey(sidebarClient);
                                    setClients((prev) =>
                                        prev.map((client) => {
                                            if (getClientKey(client) !== key) return client;
                                            const updatedSelections = client.invoiceSelections.map((selection) =>
                                                selection.invoice.path === sidebarSelection.invoice.path
                                                    ? {
                                                          ...selection,
                                                          selectedBackupPaths: new Set(client.backupFiles.map((file) => file.path)),
                                                      }
                                                    : selection
                                            );
                                            return { ...client, invoiceSelections: updatedSelections };
                                        })
                                    );
                                }}
                                className="btn btn-secondary flex-1"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!sidebarClient || !sidebarSelection) return;
                                    const key = getClientKey(sidebarClient);
                                    setClients((prev) =>
                                        prev.map((client) => {
                                            if (getClientKey(client) !== key) return client;
                                            const updatedSelections = client.invoiceSelections.map((selection) =>
                                                selection.invoice.path === sidebarSelection.invoice.path
                                                    ? {
                                                          ...selection,
                                                          selectedBackupPaths: new Set<string>(),
                                                      }
                                                    : selection
                                            );
                                            return { ...client, invoiceSelections: updatedSelections };
                                        })
                                    );
                                }}
                                className="btn btn-secondary flex-1"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-600">Select an invoice to configure its backups.</div>
                )}
            </Sidebar>
        </div>
    );
}
