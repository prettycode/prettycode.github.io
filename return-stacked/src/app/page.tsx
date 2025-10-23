'use client';

import PortfolioManager from '@/components/portfolio/PortfolioManager';

export default function Home(): React.ReactElement {
    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="container mx-auto py-6">
                <PortfolioManager />
            </div>
        </div>
    );
}
