'use client';

export default function KalconHeader() {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b-2" style={{ borderBottomColor: '#2596be' }}>
            <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                        <span className="text-3xl font-bold" style={{ color: '#38435f' }}>KAL</span>
                        <span className="text-3xl font-bold" style={{ color: '#00b2c8' }}>CON</span>
                    </div>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <span className="text-lg font-medium text-gray-700">Invoice Merger</span>
                </div>

                {/* Powered by badge */}
                <div className="text-xs text-gray-500">
                    Powered by <span className="font-semibold" style={{ color: '#2596be' }}>XP3R Inc.</span>
                </div>
            </div>
        </div>
    );
}

