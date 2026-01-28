'use client';

import ETFTaxYieldCalculator from '@/features/etf-tax-calculator/components/etf-tax-yield-calculator';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ETFCalculatorPage(): React.ReactElement {
    return (
        <div>
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-6 py-4">
                    <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors w-fit">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Portfolio Builder</span>
                    </Link>
                </div>
            </div>
            <ETFTaxYieldCalculator />
        </div>
    );
}
