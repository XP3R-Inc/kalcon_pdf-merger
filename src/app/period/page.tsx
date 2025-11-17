'use client';

import { useState, useEffect } from 'react';
import type { ClientPeriod } from '../../../electron/ipc/types';
import StepIndicator from '../../components/StepIndicator';
import { navigateToPage } from '../../lib/router';

export default function PeriodPage() {
    const [basePath, setBasePath] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [fiscalYear, setFiscalYear] = useState<string>('');
    const [month, setMonth] = useState<string>('');
    const [clients, setClients] = useState<ClientPeriod[]>([]);
    const [availablePeriods, setAvailablePeriods] = useState<{
        fiscalYears: string[];
        months: string[];
    }>({ fiscalYears: [], months: [] });

    const steps = [
        { number: 1, label: 'Base Folder', status: 'completed' as const },
        { number: 2, label: 'Select Period', status: 'active' as const },
        { number: 3, label: 'Choose Clients', status: 'inactive' as const },
        { number: 4, label: 'Merge', status: 'inactive' as const },
    ];

    useEffect(() => {
        const stored = sessionStorage.getItem('basePath');
        if (!stored) {
            navigateToPage('/');
            return;
        }
        setBasePath(stored);

        // Initial scan to get available periods
        scanForPeriods(stored);
    }, []);

    const scanForPeriods = async (path: string, fy?: string, mo?: string) => {
        setLoading(true);
        setError('');

        try {
            if (typeof window !== 'undefined' && window.electronAPI) {
                const result = await window.electronAPI.scan({
                    basePath: path,
                    fy,
                    month: mo,
                });

                setClients(result.clients);

                // Extract unique fiscal years and months
                const fySet = new Set<string>();
                const monthSet = new Set<string>();

                result.clients.forEach((client) => {
                    fySet.add(client.fiscalYear);
                    monthSet.add(client.month);
                });

                setAvailablePeriods({
                    fiscalYears: Array.from(fySet).sort(),
                    months: Array.from(monthSet).sort(),
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to scan folders');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFiscalYearChange = (fy: string) => {
        setFiscalYear(fy);
        scanForPeriods(basePath, fy, month);
    };

    const handleMonthChange = (mo: string) => {
        setMonth(mo);
        scanForPeriods(basePath, fiscalYear, mo);
    };

    const handleContinue = () => {
        if (!fiscalYear || !month) {
            setError('Please select both fiscal year and month');
            return;
        }

        // Store selections
        sessionStorage.setItem('fiscalYear', fiscalYear);
        sessionStorage.setItem('month', month);
        sessionStorage.setItem('clients', JSON.stringify(clients));

        navigateToPage('/clients');
    };

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
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
                                Select Period
                            </h1>
                            <p className="text-gray-600 mt-1">Choose the fiscal year and month to filter clients</p>
                        </div>
                        <button
                            onClick={() => navigateToPage('/')}
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

                    <div className="mb-6 p-4 rounded-lg" style={{
                        background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.05) 0%, rgba(0, 178, 200, 0.05) 100%)',
                        border: '1px solid rgba(37, 150, 190, 0.2)'
                    }}>
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <strong className="text-gray-900">Base Path:</strong>
                            <span className="ml-2 text-gray-700 font-mono text-sm">{basePath}</span>
                        </div>
                    </div>

                    {/* Period Selection */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Fiscal Year
                            </label>
                            <select
                                value={fiscalYear}
                                onChange={(e) => handleFiscalYearChange(e.target.value)}
                                className="input bg-white"
                                disabled={loading}
                            >
                                <option value="">Select Fiscal Year</option>
                                {availablePeriods.fiscalYears.map((fy) => (
                                    <option key={fy} value={fy}>
                                        FY{fy}
                                    </option>
                                ))}
                            </select>
                            {fiscalYear && (
                                <p className="mt-2 text-sm text-green-600 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    FY{fiscalYear} Selected
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Month Period
                            </label>
                            <select
                                value={month}
                                onChange={(e) => handleMonthChange(e.target.value)}
                                className="input bg-white"
                                disabled={loading}
                            >
                                <option value="">Select Month</option>
                                {availablePeriods.months.map((mo) => (
                                    <option key={mo} value={mo}>
                                        {mo}
                                    </option>
                                ))}
                            </select>
                            {month && (
                                <p className="mt-2 text-sm text-green-600 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {month} Selected
                                </p>
                            )}
                        </div>
                    </div>

                    {loading && (
                        <div className="text-center py-12 rounded-xl" style={{
                            background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.05) 0%, rgba(0, 178, 200, 0.05) 100%)'
                        }}>
                            <div className="spinner mx-auto mb-4"></div>
                            <p className="text-gray-700 font-medium">Scanning folders...</p>
                            <p className="text-sm text-gray-600 mt-1">Discovering clients and periods</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 flex items-start">
                            <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <h3 className="font-semibold text-red-900">Error</h3>
                                <p className="text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    {!loading && clients.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Found {clients.length} client{clients.length !== 1 ? 's' : ''}
                                </h2>
                                <span className="badge badge-info">
                                    FY{fiscalYear} {month}
                                </span>
                            </div>

                            <div className="table-wrapper max-h-96 overflow-y-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Client
                                                </div>
                                            </th>
                                            <th>
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    Period
                                                </div>
                                            </th>
                                            <th>
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Invoice
                                                </div>
                                            </th>
                                            <th>
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                    </svg>
                                                    Backups
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map((client, idx) => (
                                            <tr key={idx}>
                                                <td className="font-medium text-gray-900">{client.clientName}</td>
                                                <td className="text-gray-600">
                                                    FY{client.fiscalYear} {client.month}
                                                </td>
                                                <td>
                                                    {client.invoiceFile ? (
                                                        <span className="badge badge-success">
                                                            ✓ Found
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-danger">
                                                            ✗ Missing
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="badge badge-info">
                                                        {client.backupFiles.length} file{client.backupFiles.length !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-blue-900">
                                    <strong>Tip:</strong> Clients with missing invoices will be visible in the next step, where you can choose from multiple invoice candidates if available.
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && clients.length === 0 && fiscalYear && month && (
                        <div className="text-center py-12 bg-gray-50 rounded-xl">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-600 font-medium">No clients found for the selected period</p>
                            <p className="text-sm text-gray-500 mt-1">Try selecting a different fiscal year or month</p>
                        </div>
                    )}

                    <button
                        onClick={handleContinue}
                        className="btn btn-primary w-full py-4 text-lg font-semibold"
                        disabled={!fiscalYear || !month || clients.length === 0}
                    >
                        Continue to Client Selection
                        <svg className="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

