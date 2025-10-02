import React, { useState, useCallback } from 'react';
import { deserializePortfolio } from '../../utils';
import TickerOrTemplateSelectionTable from './TickerOrTemplateSelectionTable';
import CompositionPanel from './CompositionPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Folder } from 'lucide-react';
import type { CustomPortfolio, ETF, Portfolio, SerializedPortfolio, AllocationUpdate } from '../../types';

interface BuilderProps {
    customPortfolio: CustomPortfolio;
    etfCatalog: ETF[];
    tempInputs: Record<string, string | undefined>;
    showDetailColumns: boolean;
    totalAllocation: number;
    examplePortfolios: Portfolio[];
    savedPortfolios: SerializedPortfolio[];
    onAddETF: (ticker: string) => void;
    onRemoveETF: (ticker: string) => void;
    onUpdateAllocation: (ticker: string, newPercentage: number) => void;
    onBulkUpdateAllocations: (updates: AllocationUpdate[], overrideLocks?: boolean) => void;
    onToggleLock: (ticker: string) => void;
    onToggleDisable: (ticker: string) => void;
    onInputChange: (ticker: string, value: string) => void;
    onInputBlur: (ticker: string) => void;
    onResetPortfolio: () => void;
    onSavePortfolio: () => void;
    onToggleDetailColumns: () => void;
    onDeletePortfolio: (name: string) => void;
    onUpdatePortfolio: (portfolio: CustomPortfolio, isTemplateLoad?: boolean, templateData?: Portfolio | null) => void;
    onResetToTemplate?: () => void;
    isTemplateModified: boolean;
}

const Builder: React.FC<BuilderProps> = ({
    customPortfolio,
    etfCatalog,
    tempInputs,
    showDetailColumns,
    totalAllocation,
    examplePortfolios,
    savedPortfolios,
    onAddETF,
    onRemoveETF,
    onUpdateAllocation,
    onBulkUpdateAllocations,
    onToggleLock,
    onToggleDisable,
    onInputChange,
    onInputBlur,
    onResetPortfolio,
    onSavePortfolio,
    onToggleDetailColumns,
    onDeletePortfolio,
    onUpdatePortfolio,
    onResetToTemplate,
    isTemplateModified,
}) => {
    const [activeTab, setActiveTab] = useState('build');
    const [portfolioName, setPortfolioName] = useState(customPortfolio.name || '');

    React.useEffect(() => {
        setPortfolioName(customPortfolio.name);
    }, [customPortfolio.name]);

    const loadPortfolio = useCallback(
        (portfolio: Portfolio | SerializedPortfolio, isSaved: boolean = false): void => {
            const portfolioToLoad = isSaved
                ? deserializePortfolio(portfolio as SerializedPortfolio)
                : (portfolio as Portfolio);

            const newHoldings = new Map<string, import('../../types').Holding>();

            for (const [ticker, value] of portfolioToLoad.holdings.entries()) {
                newHoldings.set(ticker, {
                    percentage: typeof value === 'number' ? value : value.percentage,
                    locked: false,
                    disabled: false,
                });
            }

            const isTemplateLoad = !isSaved;

            onUpdatePortfolio(
                {
                    name: portfolioToLoad.name,
                    description: portfolioToLoad.description ?? '',
                    holdings: newHoldings,
                },
                isTemplateLoad,
                isTemplateLoad ? (portfolio as Portfolio) : null
            );

            setPortfolioName(portfolioToLoad.name);
            setActiveTab('build');
        },
        [onUpdatePortfolio]
    );

    const isPortfolioEmpty = customPortfolio.holdings.size === 0;

    const isPortfolioValid = Math.abs(totalAllocation - 100) <= 0.1 && customPortfolio.holdings.size > 0;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold">Portfolio Builder</h2>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="build" className="flex items-center gap-1 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        <span>Build</span>
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="flex items-center gap-1 cursor-pointer">
                        <Folder className="h-4 w-4" />
                        <span>Saved</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="build">
                    <div className="space-y-3">
                        <TickerOrTemplateSelectionTable
                            mode="templates"
                            templates={examplePortfolios}
                            onSelect={(item) => loadPortfolio(item as Portfolio)}
                            title="Search Templates..."
                            etfCatalog={etfCatalog}
                        />

                        <CompositionPanel
                            isPortfolioEmpty={isPortfolioEmpty}
                            setActiveTab={setActiveTab}
                            customPortfolio={customPortfolio}
                            etfCatalog={etfCatalog}
                            tempInputs={tempInputs}
                            showDetailColumns={showDetailColumns}
                            totalAllocation={totalAllocation}
                            isPortfolioValid={isPortfolioValid}
                            portfolioName={portfolioName}
                            onToggleDetailColumns={onToggleDetailColumns}
                            onUpdateAllocation={onUpdateAllocation}
                            onBulkUpdateAllocations={onBulkUpdateAllocations}
                            onToggleLock={onToggleLock}
                            onToggleDisable={onToggleDisable}
                            onInputChange={onInputChange}
                            onInputBlur={onInputBlur}
                            onRemoveETF={onRemoveETF}
                            onResetPortfolio={onResetPortfolio}
                            onSavePortfolio={onSavePortfolio}
                            onResetToTemplate={onResetToTemplate}
                            isTemplateModified={isTemplateModified}
                        />

                        <TickerOrTemplateSelectionTable
                            etfCatalog={etfCatalog}
                            onSelect={(item) => onAddETF(item as string)}
                            existingTickers={Array.from(customPortfolio.holdings.keys())}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="saved">
                    <Card className="bg-gradient-to-br from-background to-muted/20 border border-border/40 py-0">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-medium mb-4">Your Saved Portfolios</h3>

                            {savedPortfolios.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <Folder className="h-12 w-12 text-muted-foreground/40 mb-3" />
                                    <h4 className="text-base font-medium mb-2">No Saved Portfolios</h4>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        You haven&apos;t saved any portfolios yet. Build a portfolio and save it to see
                                        it here.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('build')}
                                        className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        <span>Create a Portfolio</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {savedPortfolios.map((portfolio, index) => (
                                        <div
                                            key={`${portfolio.name}-${index}`}
                                            className="border border-border/40 rounded-lg overflow-hidden group"
                                        >
                                            <div className="p-4">
                                                <h4 className="font-medium mb-1">
                                                    {portfolio.name || 'Unnamed Portfolio'}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    {portfolio.description ||
                                                        (portfolio.createdAt
                                                            ? `Created on ${new Date(
                                                                  portfolio.createdAt
                                                              ).toLocaleDateString()}`
                                                            : 'No creation date available')}
                                                </p>
                                                <div className="text-xs text-muted-foreground mb-3">
                                                    {portfolio.etfCount || portfolio.holdings.length} ETFs
                                                </div>
                                            </div>

                                            <div className="flex border-t border-border/40">
                                                <button
                                                    onClick={() =>
                                                        loadPortfolio(portfolio as unknown as Portfolio, true)
                                                    }
                                                    className="flex-1 py-2 text-xs font-medium text-center hover:bg-muted/50 transition-colors text-foreground cursor-pointer"
                                                >
                                                    Load
                                                </button>
                                                <div className="w-px bg-border/40"></div>
                                                <button
                                                    onClick={() => onDeletePortfolio(portfolio.name)}
                                                    className="flex-1 py-2 text-xs font-medium text-center hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Builder;
