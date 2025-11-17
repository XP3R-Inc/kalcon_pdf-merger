'use client';

import { useEffect, useRef } from 'react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Sidebar({ isOpen, onClose, title, children }: SidebarProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                ref={sidebarRef}
                className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto"
            >
                <div className="sticky top-0 text-white p-6 shadow-md z-10" style={{ background: 'linear-gradient(135deg, #2596be 0%, #00b2c8 100%)' }}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 text-3xl font-light transition-colors"
                        >
                            ×
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </>
    );
}

