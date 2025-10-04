'use client';

import PortfolioManager from '@/components/portfolio/PortfolioManager';

export default function Home(): React.ReactElement {
    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="container mx-auto py-6">
                <div className="mb-6 px-4">
                    <h1 className="text-2xl font-bold">Portfolio Builder</h1>
                </div>

                <div className="mt-4">
                    <PortfolioManager />
                </div>
            </div>
        </div>
    );
}
