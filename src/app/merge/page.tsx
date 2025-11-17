'use client';

import { useState, useEffect } from 'react';
import type { MergeResult } from '../../../electron/ipc/types';
import type { SelectedInvoiceJob } from '../../lib/types';
import StepIndicator from '../../components/StepIndicator';
import Notification from '../../components/Notification';
import { formatFilename, getFilenamePreview, validateFilenameTemplate, FILENAME_TEMPLATES } from '../../lib/filenameFormatter';
import { navigateToPage } from '../../lib/router';

export default function MergePage() {
    const [clients, setClients] = useState<SelectedInvoiceJob[]>([]);
    const [outputMode, setOutputMode] = useState<'client-folder' | 'custom-folder'>('client-folder');
    const [customOutputPath, setCustomOutputPath] = useState<string>('');
    const [merging, setMerging] = useState(false);
    const [results, setResults] = useState<MergeResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [progress, setProgress] = useState(0);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    // Filename customization
    const [filenameTemplate, setFilenameTemplate] = useState<string>('{month} - {invoiceName} + Backup');
    const [showFilenameCustomization, setShowFilenameCustomization] = useState(false);

    const steps = [
        { number: 1, label: 'Base Folder', status: 'completed' as const },
        { number: 2, label: 'Select Period', status: 'completed' as const },
        { number: 3, label: 'Choose Clients', status: 'completed' as const },
        { number: 4, label: 'Merge', status: 'active' as const },
    ];

    useEffect(() => {
        const stored = sessionStorage.getItem('selectedClients');
        if (!stored) {
            navigateToPage('/clients');
            return;
        }

        const parsed: SelectedInvoiceJob[] = JSON.parse(stored);
        setClients(parsed);
    }, []);

    const handlePickOutputFolder = async () => {
        try {
            if (typeof window !== 'undefined' && window.electronAPI) {
                const selected = await window.electronAPI.pickOutputDir();
                if (selected) {
                    setCustomOutputPath(selected);
                }
            }
        } catch (err) {
            console.error('Failed to pick output folder:', err);
            setNotification({ type: 'error', message: 'Failed to select output folder' });
        }
    };

    const handleMerge = async () => {
        if (outputMode === 'custom-folder' && !customOutputPath) {
            setNotification({ type: 'error', message: 'Please select a custom output folder' });
            return;
        }

        setMerging(true);
        setResults([]);
        setShowResults(false);
        setProgress(0);

        try {
            if (typeof window !== 'undefined' && window.electronAPI) {
                const jobs = clients.map((client) => ({
                    clientName: client.clientName,
                    clientPath: client.clientPath,
                    fiscalYear: client.fiscalYear,
                    month: client.month,
                    invoicePath: client.invoiceFile.path,
                    backupPaths: client.backupFiles.map((f) => f.path),
                }));

                // Simulate progress
                const progressInterval = setInterval(() => {
                    setProgress((prev) => {
                        if (prev >= 90) return prev;
                        return prev + 10;
                    });
                }, 300);

                const response = await window.electronAPI.merge({
                    jobs,
                    outputMode,
                    customOutputPath: outputMode === 'custom-folder' ? customOutputPath : undefined,
                    filenameTemplate: filenameTemplate || undefined,
                });

                clearInterval(progressInterval);
                setProgress(100);

                setResults(response.results);
                setShowResults(true);

                const successCount = response.results.filter((r) => r.success).length;
                const failureCount = response.results.filter((r) => !r.success).length;

                if (failureCount === 0) {
                    setNotification({
                        type: 'success',
                        message: `Successfully merged ${successCount} client${successCount !== 1 ? 's' : ''}!`
                    });
                } else {
                    setNotification({
                        type: 'error',
                        message: `Completed with ${successCount} successful and ${failureCount} failed merges`
                    });
                }
            }
        } catch (err) {
            setNotification({
                type: 'error',
                message: `Merge failed: ${err instanceof Error ? err.message : String(err)}`
            });
            console.error(err);
        } finally {
            setMerging(false);
        }
    };

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-5xl mx-auto">
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
                                Merge Invoices
                            </h1>
                            <p className="text-gray-600 mt-1">Configure output settings and execute merge</p>
                        </div>
                        <button
                            onClick={() => navigateToPage('/clients')}
                            className="btn btn-secondary"
                            disabled={merging}
                        >
                            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                    </div>

                    {/* Steps */}
                    <StepIndicator steps={steps} />

                    {/* Selected Clients Summary */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2" style={{ color: '#2596be' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Selected Invoice Jobs ({clients.length})
                        </h2>
                        <div className="table-wrapper max-h-60 overflow-y-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Client</th>
                                        <th>Invoice</th>
                                        <th>Backups</th>
                                        <th>Output Filename</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((client, idx) => (
                                        <tr key={idx}>
                                            <td className="font-medium text-gray-900">
                                                {client.clientName}
                                                <div className="text-xs text-gray-500">FY{client.fiscalYear} {client.month}</div>
                                            </td>
                                            <td className="text-sm text-gray-600">
                                                {client.invoiceFile.name}
                                            </td>
                                            <td>
                                                <span className="badge badge-info">
                                                    {client.backupFiles.length} file{client.backupFiles.length !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="text-xs font-mono text-gray-600 max-w-xs truncate">
                                                {formatFilename(filenameTemplate, {
                                                    month: client.month,
                                                    invoiceName: client.invoiceFile.name.replace('.pdf', ''),
                                                    clientName: client.clientName,
                                                    fiscalYear: client.fiscalYear,
                                                })}.pdf
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Output Settings */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2" style={{ color: '#00b2c8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Output Settings
                        </h2>

                        <div className="space-y-4">
                            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-kalcon-primary"
                                style={{
                                    borderColor: outputMode === 'client-folder' ? '#2596be' : '#e5e7eb',
                                    backgroundColor: outputMode === 'client-folder' ? 'rgba(37, 150, 190, 0.05)' : 'white'
                                }}>
                                <input
                                    type="radio"
                                    checked={outputMode === 'client-folder'}
                                    onChange={() => setOutputMode('client-folder')}
                                    disabled={merging}
                                    className="mt-1"
                                    style={{ accentColor: '#2596be' }}
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 flex items-center">
                                        <svg className="w-5 h-5 mr-2" style={{ color: '#2596be' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        Save to each client's Invoice folder
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 ml-7">
                                        Merged PDFs will be saved in each client's Invoice directory (recommended)
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-kalcon-accent"
                                style={{
                                    borderColor: outputMode === 'custom-folder' ? '#00b2c8' : '#e5e7eb',
                                    backgroundColor: outputMode === 'custom-folder' ? 'rgba(0, 178, 200, 0.05)' : 'white'
                                }}>
                                <input
                                    type="radio"
                                    checked={outputMode === 'custom-folder'}
                                    onChange={() => setOutputMode('custom-folder')}
                                    disabled={merging}
                                    className="mt-1"
                                    style={{ accentColor: '#00b2c8' }}
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 flex items-center">
                                        <svg className="w-5 h-5 mr-2" style={{ color: '#00b2c8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                        </svg>
                                        Save all to a custom folder
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 ml-7 mb-3">
                                        All merged PDFs will be saved to a single directory of your choice
                                    </p>

                                    {outputMode === 'custom-folder' && (
                                        <div className="ml-7 flex gap-2">
                                            <input
                                                type="text"
                                                value={customOutputPath}
                                                onChange={(e) => setCustomOutputPath(e.target.value)}
                                                placeholder="Select custom output folder"
                                                disabled={merging}
                                                className="input flex-1 bg-white text-sm"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handlePickOutputFolder();
                                                }}
                                                disabled={merging}
                                                className="btn btn-secondary"
                                            >
                                                Browse...
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>

                        {/* File naming customization */}
                        <div className="mt-6">
                            <button
                                onClick={() => setShowFilenameCustomization(!showFilenameCustomization)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3"
                            >
                                <svg className="w-5 h-5" style={{ color: '#2596be' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Customize Filename Format
                                <svg
                                    className={`w-4 h-4 transition-transform ${showFilenameCustomization ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showFilenameCustomization && (
                                <div className="p-4 border-2 rounded-lg" style={{ borderColor: '#2596be', backgroundColor: 'rgba(37, 150, 190, 0.02)' }}>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Filename Template
                                        </label>
                                        <input
                                            type="text"
                                            value={filenameTemplate}
                                            onChange={(e) => setFilenameTemplate(e.target.value)}
                                            className="input bg-white font-mono text-sm"
                                            placeholder="{month} - {invoiceName} + Backup"
                                        />
                                    </div>

                                    {/* Available Placeholders */}
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Available Placeholders:</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <code className="bg-white px-2 py-1 rounded border border-gray-200 font-mono" style={{ color: '#2596be' }}>{'{month}'}</code>
                                                <span className="text-gray-600">→ 04-25</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-white px-2 py-1 rounded border border-gray-200 font-mono" style={{ color: '#2596be' }}>{'{invoiceName}'}</code>
                                                <span className="text-gray-600">→ Invoice name</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-white px-2 py-1 rounded border border-gray-200 font-mono" style={{ color: '#2596be' }}>{'{client}'}</code>
                                                <span className="text-gray-600">→ Client name</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-white px-2 py-1 rounded border border-gray-200 font-mono" style={{ color: '#2596be' }}>{'{fy}'}</code>
                                                <span className="text-gray-600">→ 25</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-white px-2 py-1 rounded border border-gray-200 font-mono" style={{ color: '#2596be' }}>{'{monthNum}'}</code>
                                                <span className="text-gray-600">→ 04</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-white px-2 py-1 rounded border border-gray-200 font-mono" style={{ color: '#2596be' }}>{'{year}'}</code>
                                                <span className="text-gray-600">→ 25</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Templates */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Quick Templates
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(FILENAME_TEMPLATES).map(([key, template]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setFilenameTemplate(template)}
                                                    className="btn btn-sm btn-secondary text-left justify-start"
                                                >
                                                    <div className="truncate">
                                                        <div className="font-medium text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                                                        <div className="text-xs text-gray-500 font-mono truncate">{template}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            <div className="flex-1">
                                                <div className="text-xs font-semibold text-green-900 mb-1">Preview:</div>
                                                <div className="font-mono text-sm text-green-800 break-all">
                                                    {getFilenamePreview(filenameTemplate)}.pdf
                                                </div>
                                                <div className="text-xs text-green-700 mt-1">
                                                    (Example: Acme Corp, FY25, 04-25, ClientInvoice.pdf)
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Validation Error */}
                                    {(() => {
                                        const validation = validateFilenameTemplate(filenameTemplate);
                                        return !validation.valid && (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                {validation.error}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {!showFilenameCustomization && (
                                <div className="p-4 bg-blue-50 rounded-lg flex items-start">
                                    <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-sm text-blue-900">
                                        <strong>Output Format:</strong> Files will be named <code className="px-1 py-0.5 bg-blue-100 rounded font-mono">{getFilenamePreview(filenameTemplate)}.pdf</code>
                                        <br />
                                        Duplicate filenames will automatically append (1), (2), etc.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Merge Button or Progress */}
                    {!showResults && !merging && (
                        <button
                            onClick={handleMerge}
                            disabled={merging || clients.length === 0}
                            className="btn btn-primary w-full py-4 text-lg font-semibold"
                        >
                            <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Start Merging {clients.length} Client{clients.length !== 1 ? 's' : ''}
                        </button>
                    )}

                    {merging && (
                        <div className="rounded-xl p-8" style={{
                            background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.05) 0%, rgba(0, 178, 200, 0.05) 100%)'
                        }}>
                            <div className="text-center">
                                <div className="spinner mx-auto mb-4"></div>
                                <p className="text-gray-900 font-semibold text-lg mb-2">Merging in progress...</p>
                                <p className="text-gray-600 text-sm mb-4">Please wait while we process your files</p>

                                {/* Progress Bar */}
                                <div className="progress-bar mb-2">
                                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className="text-sm text-gray-600">{progress}% Complete</p>
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {showResults && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-xl border-2 border-green-200 bg-green-50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-green-700 font-medium">Successful</p>
                                            <p className="text-4xl font-bold text-green-800">{successCount}</p>
                                        </div>
                                        <svg className="w-16 h-16 text-green-600 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="p-6 rounded-xl border-2 border-red-200 bg-red-50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-red-700 font-medium">Failed</p>
                                            <p className="text-4xl font-bold text-red-800">{failureCount}</p>
                                        </div>
                                        <svg className="w-16 h-16 text-red-600 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Results */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Detailed Results</h3>
                                <div className="table-wrapper max-h-80 overflow-y-auto">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Client</th>
                                                <th>Status</th>
                                                <th>Output / Error</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((result, idx) => (
                                                <tr key={idx} className={result.success ? '' : 'bg-red-50'}>
                                                    <td className="font-medium text-gray-900">{result.clientName}</td>
                                                    <td>
                                                        {result.success ? (
                                                            <span className="badge badge-success">
                                                                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                                Success
                                                            </span>
                                                        ) : (
                                                            <span className="badge badge-danger">
                                                                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                </svg>
                                                                Failed
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-sm">
                                                        {result.success ? (
                                                            <span className="text-gray-600 break-all font-mono text-xs">{result.outputPath}</span>
                                                        ) : (
                                                            <span className="text-red-600">{result.error}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigateToPage('/')}
                                    className="btn btn-primary flex-1 py-3"
                                >
                                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Start New Session
                                </button>
                                <button
                                    onClick={() => {
                                        setShowResults(false);
                                        setResults([]);
                                        setProgress(0);
                                    }}
                                    className="btn btn-secondary flex-1 py-3"
                                >
                                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Merge Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Notifications */}
            {notification && (
                <Notification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
}
