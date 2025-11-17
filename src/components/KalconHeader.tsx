'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

export default function KalconHeader() {
    const [submitting, setSubmitting] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [issueTitle, setIssueTitle] = useState('Bug report');
    const [issueDescription, setIssueDescription] = useState('');

    const electronAPI = useMemo(() => (typeof window !== 'undefined' ? window.electronAPI : undefined), []);

    const openIssueModal = useCallback(() => {
        setIssueTitle('Bug report');
        setIssueDescription('');
        setShowIssueModal(true);
    }, []);

    const handleReportIssue = useCallback(() => {
        openIssueModal();
    }, [openIssueModal]);

    const submitIssue = useCallback(async () => {
        const title = issueTitle.trim();
        const description = issueDescription.trim() || undefined;
        if (!title) {
            window.alert('Please add a title for the issue.');
            return;
        }

        // If we're not in Electron, fall back to email.
        if (!electronAPI?.reportIssue) {
            const mailto = new URL(`mailto:eliogerges@xp3rinc.com`);
            mailto.searchParams.set('subject', `Invoice Merger Support: ${title}`);
            if (description) {
                mailto.searchParams.set('body', description);
            }
            window.open(mailto.toString(), '_blank', 'noreferrer');
            return;
        }

        setSubmitting(true);
        try {
            await electronAPI.reportIssue({
                title,
                description,
                includeLogs: true,
            });
            window.alert('Thanks! Your report has been sent to the support team.');
            setShowIssueModal(false);
        } catch (error) {
            console.error(error);
            window.alert('Failed to send report. Please try again or email support.');
        } finally {
            setSubmitting(false);
        }
    }, [electronAPI, issueDescription, issueTitle]);

    const openGuideFallback = () => {
        if (typeof window === 'undefined') return;
        const url = `${window.location.origin}/XP3R%20Invoice%20Merger.docx`;
        window.open(url, '_blank', 'noreferrer');
    };

    const handleOpenGuide = useCallback(async () => {
        if (electronAPI?.openSupportLink) {
            try {
                await electronAPI.openSupportLink('guide');
                return;
            } catch (error) {
                console.error('Failed to open guide via Electron:', error);
            }
        }
        openGuideFallback();
    }, [electronAPI]);

    const handleContactSupport = useCallback(async () => {
        if (electronAPI?.openSupportLink) {
            try {
                await electronAPI.openSupportLink('email');
                return;
            } catch (error) {
                console.error('Failed to open email client via Electron:', error);
            }
        }
        window.location.href = 'mailto:eliogerges@xp3rinc.com?subject=Invoice%20Merger%20Support';
    }, [electronAPI]);

    useEffect(() => {
        if (!electronAPI?.onReportIssueRequest) return;
        const unsubscribe = electronAPI.onReportIssueRequest(() => {
            openIssueModal();
        });
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [electronAPI, openIssueModal]);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b-2" style={{ borderBottomColor: '#2596be' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Logo */}
                <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                        <span className="text-3xl font-bold" style={{ color: '#38435f' }}>KAL</span>
                        <span className="text-3xl font-bold" style={{ color: '#00b2c8' }}>CON</span>
                    </div>
                    <div className="h-8 w-px bg-gray-300 hidden sm:block" />
                    <span className="text-lg font-medium text-gray-700">Invoice Merger</span>
                </div>

                <div className="flex items-center gap-2 text-sm flex-wrap">
                    <button
                        type="button"
                        onClick={handleOpenGuide}
                        className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-blue-600 transition"
                    >
                        User Guide
                    </button>
                    <button
                        type="button"
                        onClick={handleContactSupport}
                        className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-blue-600 transition"
                    >
                        Contact Support
                    </button>
                    <button
                        type="button"
                        onClick={handleReportIssue}
                        disabled={submitting}
                        className="btn btn-secondary btn-sm whitespace-nowrap"
                    >
                        {submitting ? 'Sending…' : 'Report Issue'}
                    </button>
                    <span className="text-xs text-gray-500 ml-auto md:ml-4">
                        Powered by <span className="font-semibold" style={{ color: '#2596be' }}>XP3R Inc.</span>
                    </span>
                </div>
            </div>

            {showIssueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Report an Issue</h2>
                            <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700"
                                onClick={() => setShowIssueModal(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={(e: FormEvent) => {
                                e.preventDefault();
                                void submitIssue();
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
                                <input
                                    type="text"
                                    value={issueTitle}
                                    onChange={(e) => setIssueTitle(e.target.value)}
                                    className="input bg-white"
                                    placeholder="Short summary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                                <textarea
                                    value={issueDescription}
                                    onChange={(e) => setIssueDescription(e.target.value)}
                                    className="input bg-white h-32 resize-none"
                                    placeholder="Steps to reproduce, expected behavior, etc."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    We'll attach app logs automatically to help the engineering team investigate.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowIssueModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Sending…' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

