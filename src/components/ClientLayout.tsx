'use client';

import KalconHeader from './KalconHeader';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <KalconHeader />
            <div className="min-h-screen pt-16">
                {children}
            </div>
        </>
    );
}

