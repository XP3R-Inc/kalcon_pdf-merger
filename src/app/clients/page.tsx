'use client';

import { useState, useEffect } from 'react';
import type { ClientPeriod, FileInfo } from '../../../electron/ipc/types';
import StepIndicator from '../../components/StepIndicator';
import Sidebar from '../../components/Sidebar';
import FolderTree, { buildFolderTree } from '../../components/FolderTree';
import type { BackupFolder } from '../../lib/types';
import { navigateToPage } from '../../lib/router';

interface TreeFolder {
    name: string;
    path: string;
    files: FileInfo[];
    subfolders: TreeFolder[];
    depth: number;
}

interface ExtendedClient extends ClientPeriod {
    invoiceCandidates?: FileInfo[];
    selectedInvoice?: FileInfo;
    backupFolders: BackupFolder[];
    folderTree: TreeFolder[];
    selectedBackupPaths: Set<string>;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<ExtendedClient[]>([]);
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
    const [filters, setFilters] = useState({
        client: '',
        invoice: '',
        expense: '',
        showAll: false,
    });

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedClientForSidebar, setSelectedClientForSidebar] = useState<ExtendedClient | null>(null);

    const steps = [
        { number: 1, label: 'Base Folder', status: 'completed' as const },
        { number: 2, label: 'Select Period', status: 'completed' as const },
        { number: 3, label: 'Choose Clients', status: 'active' as const },
        { number: 4, label: 'Merge', status: 'inactive' as const },
    ];

    useEffect(() => {
        const stored = sessionStorage.getItem('clients');
        if (!stored) {
            navigateToPage('/period');
            return;
        }

        const parsed: ClientPeriod[] = JSON.parse(stored);

        // Initialize extended clients with backup folders and tree
        const extended: ExtendedClient[] = parsed.map((client) => {
            const folderTree = buildFolderTree(client.backupFiles, client.backupPath);

            // Auto-select all backup files initially
            const selectedBackupPaths = new Set<string>();
            client.backupFiles.forEach((file) => selectedBackupPaths.add(file.path));

            return {
                ...client,
                selectedInvoice: client.invoiceFile || undefined,
                backupFolders: [], // Keep for compatibility
                folderTree,
                selectedBackupPaths,
            };
        });

        setClients(extended);

        // Auto-select clients with invoices by default
        const autoSelected = new Set<string>();
        extended.forEach((client) => {
            if (client.invoiceFile) {
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

    // Handle invoice selection for clients with multiple candidates
    const handleInvoiceChange = async (client: ExtendedClient, invoicePath: string) => {
        // Fetch invoice candidates if not already loaded
        if (!client.invoiceCandidates) {
            try {
                if (typeof window !== 'undefined' && window.electronAPI) {
                    const result = await window.electronAPI.getInvoiceCandidates({
                        clientPath: client.clientPath,
                        fiscalYear: client.fiscalYear,
                        month: client.month,
                    });

                    const updatedClients = clients.map((c) => {
                        if (getClientKey(c) === getClientKey(client)) {
                            const selectedInvoice = result.candidates.find((f) => f.path === invoicePath);
                            return {
                                ...c,
                                invoiceCandidates: result.candidates,
                                selectedInvoice,
                            };
                        }
                        return c;
                    });

                    setClients(updatedClients);
                }
            } catch (error) {
                console.error('Failed to get invoice candidates:', error);
            }
        } else {
            // Update selected invoice
            const updatedClients = clients.map((c) => {
                if (getClientKey(c) === getClientKey(client)) {
                    const selectedInvoice = client.invoiceCandidates!.find((f) => f.path === invoicePath);
                    return {
                        ...c,
                        selectedInvoice,
                    };
                }
                return c;
            });

            setClients(updatedClients);
        }
    };

    // Open sidebar for backup selection
    const openBackupSidebar = (client: ExtendedClient) => {
        setSelectedClientForSidebar(client);
        setSidebarOpen(true);
    };

    // Toggle folder selection (recursive for tree)
    const toggleFolder = (folderPath: string) => {
        if (!selectedClientForSidebar) return;

        const updatedClients = clients.map((c) => {
            if (getClientKey(c) === getClientKey(selectedClientForSidebar)) {
                const newBackupPaths = new Set(c.selectedBackupPaths);

                // Recursively collect all files in folder and subfolders
                const collectFilesFromTree = (folders: TreeFolder[], targetPath: string): FileInfo[] => {
                    const allFiles: FileInfo[] = [];

                    const findFolder = (folders: TreeFolder[]): TreeFolder | null => {
                        for (const folder of folders) {
                            if (folder.path === targetPath) return folder;
                            const found = findFolder(folder.subfolders);
                            if (found) return found;
                        }
                        return null;
                    };

                    const collectFiles = (folder: TreeFolder) => {
                        allFiles.push(...folder.files);
                        folder.subfolders.forEach(sub => collectFiles(sub));
                    };

                    const targetFolder = findFolder(folders);
                    if (targetFolder) {
                        collectFiles(targetFolder);
                    }

                    return allFiles;
                };

                const filesInFolder = collectFilesFromTree(c.folderTree, folderPath);

                if (filesInFolder.length > 0) {
                    // Check if all files are selected
                    const allSelected = filesInFolder.every((file) => newBackupPaths.has(file.path));

                    if (allSelected) {
                        // Deselect all
                        filesInFolder.forEach((file) => newBackupPaths.delete(file.path));
                    } else {
                        // Select all
                        filesInFolder.forEach((file) => newBackupPaths.add(file.path));
                    }
                }

                return { ...c, selectedBackupPaths: newBackupPaths };
            }
            return c;
        });

        setClients(updatedClients);
        setSelectedClientForSidebar(updatedClients.find((c) => getClientKey(c) === getClientKey(selectedClientForSidebar))!);
    };

    // Toggle individual file
    const toggleFile = (filePath: string) => {
        if (!selectedClientForSidebar) return;

        const updatedClients = clients.map((c) => {
            if (getClientKey(c) === getClientKey(selectedClientForSidebar)) {
                const newBackupPaths = new Set(c.selectedBackupPaths);
                if (newBackupPaths.has(filePath)) {
                    newBackupPaths.delete(filePath);
                } else {
                    newBackupPaths.add(filePath);
                }
                return { ...c, selectedBackupPaths: newBackupPaths };
            }
            return c;
        });

        setClients(updatedClients);
        setSelectedClientForSidebar(updatedClients.find((c) => getClientKey(c) === getClientKey(selectedClientForSidebar))!);
    };

    const handleContinue = () => {
        if (selectedClients.size === 0) {
            alert('Please select at least one client');
            return;
        }

        // Store selections
        const selectedClientsList = clients
            .filter((c) => selectedClients.has(getClientKey(c)))
            .map((c) => ({
                ...c,
                backupFiles: c.backupFiles.filter((f) => c.selectedBackupPaths.has(f.path)),
                invoiceFile: c.selectedInvoice || c.invoiceFile,
            }));

        sessionStorage.setItem('selectedClients', JSON.stringify(selectedClientsList));
        navigateToPage('/merge');
    };

    // Apply filters
    const filteredClients = clients.filter((client) => {
        if (!filters.showAll && !client.invoiceFile && !client.selectedInvoice) {
            return false;
        }

        if (filters.client && !client.clientName.toLowerCase().includes(filters.client.toLowerCase())) {
            return false;
        }

        if (filters.invoice && client.selectedInvoice) {
            if (!client.selectedInvoice.name.toLowerCase().includes(filters.invoice.toLowerCase())) {
                return false;
            }
        }

        if (filters.expense) {
            const hasMatchingExpense = Array.from(client.selectedBackupPaths).some((path) => {
                const file = client.backupFiles.find((f) => f.path === path);
                return file && file.name.toLowerCase().includes(filters.expense.toLowerCase());
            });
            if (!hasMatchingExpense) {
                return false;
            }
        }

        return true;
    });

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
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">
                                {selectedClients.size}
                            </span> of {filteredClients.length} selected
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

                    {/* Clients Table */}
                    <div className="table-wrapper max-h-[500px] overflow-y-auto mb-6">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="w-12">
                                        <input
                                            type="checkbox"
                                            checked={filteredClients.length > 0 && filteredClients.every((c) => selectedClients.has(getClientKey(c)))}
                                            onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                                            className="checkbox"
                                        />
                                    </th>
                                    <th>Client Name</th>
                                    <th>Invoice</th>
                                    <th>Selected Backups</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((client) => {
                                    const key = getClientKey(client);
                                    const isSelected = selectedClients.has(key);

                                    return (
                                        <tr
                                            key={key}
                                            className={isSelected ? 'selected' : ''}
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleClient(client)}
                                                    className="checkbox"
                                                />
                                            </td>
                                            <td>
                                                <div className="font-medium text-gray-900">{client.clientName}</div>
                                                <div className="text-xs text-gray-500">
                                                    FY{client.fiscalYear} {client.month}
                                                </div>
                                            </td>
                                            <td>
                                                {client.selectedInvoice ? (
                                                    <select
                                                        value={client.selectedInvoice.path}
                                                        onChange={(e) => handleInvoiceChange(client, e.target.value)}
                                                        className="input text-sm py-1 bg-white"
                                                        onClick={async () => {
                                                            // Load candidates on first click
                                                            if (!client.invoiceCandidates) {
                                                                try {
                                                                    const result = await window.electronAPI.getInvoiceCandidates({
                                                                        clientPath: client.clientPath,
                                                                        fiscalYear: client.fiscalYear,
                                                                        month: client.month,
                                                                    });

                                                                    const updatedClients = clients.map((c) => {
                                                                        if (getClientKey(c) === key) {
                                                                            return { ...c, invoiceCandidates: result.candidates };
                                                                        }
                                                                        return c;
                                                                    });

                                                                    setClients(updatedClients);
                                                                } catch (error) {
                                                                    console.error(error);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <option value={client.selectedInvoice.path}>
                                                            {client.selectedInvoice.name}
                                                        </option>
                                                        {client.invoiceCandidates?.map((inv) => (
                                                            inv.path !== client.selectedInvoice?.path && (
                                                                <option key={inv.path} value={inv.path}>
                                                                    {inv.name}
                                                                </option>
                                                            )
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="badge badge-warning">No invoice</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge badge-info">
                                                    {client.selectedBackupPaths.size} / {client.backupFiles.length}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    onClick={() => openBackupSidebar(client)}
                                                    className="btn btn-sm btn-secondary"
                                                >
                                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    Configure
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
                        disabled={selectedClients.size === 0}
                    >
                        Continue to Merge ({selectedClients.size} selected)
                        <svg className="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Backup Selection Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                title={`Configure: ${selectedClientForSidebar?.clientName || ''}`}
            >
                {selectedClientForSidebar && (
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="p-4 rounded-lg" style={{
                            background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.05) 0%, rgba(0, 178, 200, 0.05) 100%)',
                            border: '1px solid rgba(37, 150, 190, 0.2)'
                        }}>
                            <h3 className="font-semibold text-gray-900 mb-2">Selection Summary</h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Files:</span>
                                    <span className="font-medium text-gray-900">{selectedClientForSidebar.backupFiles.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Selected:</span>
                                    <span className="font-medium text-green-600">{selectedClientForSidebar.selectedBackupPaths.size}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Folders:</span>
                                    <span className="font-medium text-gray-900">{selectedClientForSidebar.backupFolders.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Folder Tree */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-gray-900">Expense Backup Files</h3>
                                <span className="text-sm text-gray-600">
                                    {selectedClientForSidebar.selectedBackupPaths.size} / {selectedClientForSidebar.backupFiles.length} selected
                                </span>
                            </div>

                            <div className="text-xs text-gray-600 mb-3 p-2 bg-blue-50 rounded flex items-start gap-2">
                                <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    Navigate the folder tree and select/deselect files or entire folders with their subfolders.
                                </span>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-3 bg-white max-h-96 overflow-y-auto">
                                <FolderTree
                                    folders={selectedClientForSidebar.folderTree}
                                    selectedPaths={selectedClientForSidebar.selectedBackupPaths}
                                    onToggleFolder={toggleFolder}
                                    onToggleFile={toggleFile}
                                />
                            </div>

                            {/* Empty State */}
                            {selectedClientForSidebar.folderTree.length === 0 && (
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
                                onClick={() => {
                                    if (!selectedClientForSidebar) return;
                                    const updatedClients = clients.map((c) => {
                                        if (getClientKey(c) === getClientKey(selectedClientForSidebar)) {
                                            const allPaths = new Set(c.backupFiles.map((f) => f.path));
                                            return { ...c, selectedBackupPaths: allPaths };
                                        }
                                        return c;
                                    });
                                    setClients(updatedClients);
                                    setSelectedClientForSidebar(updatedClients.find((c) => getClientKey(c) === getClientKey(selectedClientForSidebar))!);
                                }}
                                className="btn btn-secondary flex-1"
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => {
                                    if (!selectedClientForSidebar) return;
                                    const updatedClients = clients.map((c) => {
                                        if (getClientKey(c) === getClientKey(selectedClientForSidebar)) {
                                            return { ...c, selectedBackupPaths: new Set<string>() };
                                        }
                                        return c;
                                    });
                                    setClients(updatedClients);
                                    setSelectedClientForSidebar(updatedClients.find((c) => getClientKey(c) === getClientKey(selectedClientForSidebar))!);
                                }}
                                className="btn btn-secondary flex-1"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                )}
            </Sidebar>
        </div>
    );
}
