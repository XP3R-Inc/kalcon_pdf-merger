'use client';

import { useState } from 'react';
import StepIndicator from '../components/StepIndicator';
import { navigateToPage } from '../lib/router';

export default function HomePage() {
    const [basePath, setBasePath] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSelectFolder = async () => {
        try {
            if (typeof window !== 'undefined' && window.electronAPI) {
                const selected = await window.electronAPI.pickOutputDir();
                if (selected) {
                    setBasePath(selected);
                    setError('');
                }
            }
        } catch (err) {
            setError('Failed to select folder');
            console.error(err);
        }
    };

    const handleContinue = () => {
        if (!basePath) {
            setError('Please select a base folder');
            return;
        }

        // Store in session storage for access across pages
        sessionStorage.setItem('basePath', basePath);
        navigateToPage('/period');
    };

    const steps = [
        { number: 1, label: 'Base Folder', status: 'active' as const },
        { number: 2, label: 'Select Period', status: 'inactive' as const },
        { number: 3, label: 'Choose Clients', status: 'inactive' as const },
        { number: 4, label: 'Merge', status: 'inactive' as const },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <div className="card max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-block p-3 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #2596be 0%, #00b2c8 100%)' }}>
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold mb-3" style={{
                        background: 'linear-gradient(135deg, #2596be 0%, #00b2c8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Invoice Merger
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Merge invoices with expense backups seamlessly
                    </p>
                </div>

                {/* Steps */}
                <StepIndicator steps={steps} />

                {/* Main Content */}
                <div className="space-y-6">
                    <div className="p-6 rounded-xl" style={{
                        background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.05) 0%, rgba(0, 178, 200, 0.05) 100%)',
                        border: '1px solid rgba(37, 150, 190, 0.2)'
                    }}>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                            Select Base Folder
                        </h2>
                        <p className="text-gray-600 mb-4 ml-11">
                            Choose the root folder containing your client directories. The app will automatically scan for invoices and backups.
                        </p>

                        <div className="ml-11">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={basePath}
                                    onChange={(e) => setBasePath(e.target.value)}
                                    placeholder="C:\Users\YourName\Documents\Invoices"
                                    className="input flex-1 bg-white"
                                />
                                <button
                                    onClick={handleSelectFolder}
                                    className="btn btn-secondary whitespace-nowrap px-6"
                                >
                                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    Browse
                                </button>
                            </div>
                            {error && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-800">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    {error}
                                </div>
                            )}
                            {basePath && !error && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-800">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Folder selected successfully
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expected Structure */}
                    <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 font-medium text-gray-900 flex items-center justify-between">
                            <span className="flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Expected Folder Structure
                            </span>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <div className="px-6 py-4 bg-gray-50">
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto font-mono">
                                {`BASE_FOLDER/
  ├── CLIENT_NAME_1/
  │   └── Invoices/
  │       └── FY25/
  │           └── 04-25/
  │               ├── Invoice/
  │               │   └── invoice.pdf
  │               └── Expense Backup/
  │                   ├── receipt1.pdf
  │                   ├── receipt2.jpg
  │                   └── subfolder/
  │                       └── more_receipts.pdf
  └── CLIENT_NAME_2/
      └── Invoices/
          └── FY25/
              └── 05-25/
                  ├── Invoice/
                  └── Expense Backup/`}
                            </pre>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <p className="font-medium text-gray-900">Fiscal Year Format</p>
                                        <p className="text-sm text-gray-600">FYXX (e.g., FY25 for 2025)</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <p className="font-medium text-gray-900">Month Format</p>
                                        <p className="text-sm text-gray-600">MM-YY (e.g., 04-25 for April 2025)</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <p className="font-medium text-gray-900">Supported Files</p>
                                        <p className="text-sm text-gray-600">PDF, PNG, JPG, JPEG</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <p className="font-medium text-gray-900">Subfolders</p>
                                        <p className="text-sm text-gray-600">Automatically scanned</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </details>

                    {/* Features Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: '🔍', title: 'Auto Discovery', desc: 'Scans your folder structure automatically' },
                            { icon: '⚡', title: 'Batch Processing', desc: 'Handle multiple clients at once' },
                            { icon: '🎯', title: 'Smart Filtering', desc: 'Filter by client, invoice, or expense' },
                            { icon: '📁', title: 'Subfolder Support', desc: 'Recursively scans backup folders' },
                            { icon: '🖼️', title: 'Image Support', desc: 'Converts images to PDF pages' },
                            { icon: '💾', title: 'Flexible Output', desc: 'Choose where to save merged files' },
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="text-3xl mb-2">{feature.icon}</div>
                                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                                <p className="text-sm text-gray-600">{feature.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={handleContinue}
                        className="btn btn-primary w-full py-4 text-lg font-semibold"
                        disabled={!basePath}
                    >
                        Continue to Period Selection
                        <svg className="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

