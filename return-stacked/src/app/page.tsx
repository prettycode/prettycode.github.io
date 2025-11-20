'use client';

import PortfolioManager from '@/components/portfolio/PortfolioManager';
import Link from 'next/link';
import { Calculator } from 'lucide-react';

export default function Home(): React.ReactElement {
    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Return Stacked Portfolio Builder</h1>
                    <Link
                        href="/etf-calculator"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Calculator className="w-5 h-5" />
                        <span>ETF Tax Calculator</span>
                    </Link>
                </div>
            </div>
            <div className="container mx-auto py-6">
                <PortfolioManager />
            </div>
        </div>
    );
}
