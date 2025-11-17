'use client';

import { useEffect } from 'react';

interface NotificationProps {
    type: 'success' | 'error' | 'info';
    message: string;
    onClose: () => void;
    duration?: number;
}

export default function Notification({ type, message, onClose, duration = 5000 }: NotificationProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: '✓',
        error: '✗',
        info: 'ℹ',
    };

    return (
        <div className={`notification notification-${type}`}>
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <span className="text-2xl">{icons[type]}</span>
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

