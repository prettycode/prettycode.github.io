'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { etfCatalog } from '@/features/portfolio/core/data/catalogs/EtfCatalog';

interface StackedETFDisplay {
    ticker: string;
    name: string;
    inceptionDate: string;
    expenseRatio: number;
    netAssets: string;
    yield: number;
    description: string;
}

export default function ETFInfoPage(): React.ReactElement {
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Filter for stacked ETFs and format the data
    const stackedETFs: StackedETFDisplay[] = etfCatalog
        .filter((etf) => etf.leverageType === 'Stacked')
        .map((etf) => {
            // Generate description from exposures
            const exposureDescriptions: string[] = [];
            etf.exposures.forEach((amount, key) => {
                const percentage = Math.round(amount * 100);
                exposureDescriptions.push(`${percentage}% ${key}`);
            });

            return {
                ticker: etf.ticker,
                name: etf.metadata?.name ?? etf.ticker,
                inceptionDate: etf.metadata?.inceptionDate ?? '',
                expenseRatio: etf.metadata?.expenseRatio ?? 0,
                netAssets: etf.metadata?.netAssets ?? 'N/A',
                yield: etf.metadata?.yield ?? 0,
                description: exposureDescriptions.join(' + '),
            };
        });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors w-fit mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Portfolio Builder</span>
                    </Link>

                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Stacked ETF Information</h1>
                    <p className="text-gray-600">Complete list of all Stacked ETFs with their key characteristics</p>
                </div>

                {/* Main Content */}
                <Card>
                    <CardHeader>
                        <CardTitle>Stacked ETF Catalog</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 text-sm text-gray-500">
                            Showing {stackedETFs.length} stacked strategy ETFs
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-semibold">Ticker</TableHead>
                                        <TableHead className="font-semibold">Name</TableHead>
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="font-semibold text-right">Expense Ratio</TableHead>
                                        <TableHead className="font-semibold text-right">Yield</TableHead>
                                        <TableHead className="font-semibold text-right">AUM</TableHead>
                                        <TableHead className="font-semibold">Inception Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stackedETFs.map((etf) => (
                                        <TableRow key={etf.ticker}>
                                            <TableCell className="font-mono font-semibold">{etf.ticker}</TableCell>
                                            <TableCell className="font-medium">{etf.name}</TableCell>
                                            <TableCell className="text-sm text-gray-600">{etf.description}</TableCell>
                                            <TableCell className="text-right">
                                                {etf.expenseRatio.toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {etf.yield > 0 ? `${etf.yield.toFixed(2)}%` : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">{etf.netAssets}</TableCell>
                                            <TableCell>
                                                {etf.inceptionDate ? formatDate(etf.inceptionDate) : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-900 mb-2">About Stacked ETFs</h3>
                            <p className="text-sm text-blue-800">
                                Stacked ETFs use a unique approach to provide investors with exposure to multiple asset
                                classes within a single fund. By using derivatives and leverage, these ETFs can deliver
                                returns similar to holding two or more separate investments, potentially improving
                                portfolio efficiency and diversification. This list includes both Return Stacked®
                                branded ETFs and other stacked strategy funds.
                            </p>
                        </div>

                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <h3 className="font-semibold text-amber-900 mb-2">Important Disclaimer</h3>
                            <p className="text-sm text-amber-800">
                                The information provided is for educational purposes only and should not be considered
                                investment advice. ETF values, yields, and assets under management change regularly.
                                Please consult the fund prospectus and visit the official fund website for the most
                                current information before making any investment decisions.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
