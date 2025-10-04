import React, { useState, useEffect } from 'react';
import type { Portfolio, ETF, SerializedPortfolio, Holding } from '@/types/portfolio';
import { deserializePortfolio } from '../../utils/storageUtils';
import TickerOrTemplateSelectionTable from './TickerOrTemplateSelectionTable';
import CompositionPanel from './CompositionPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Folder } from 'lucide-react';

interface AllocationUpdate {
    ticker: string;
    percentage: number;
}

interface BuilderProps {
    customPortfolio: Portfolio;
    etfCatalog: ETF[];
    tempInputs: Record<string, number | undefined>;
    showDetailColumns: boolean;
    totalAllocation: number;
    examplePortfolios: Portfolio[];
    savedPortfolios: SerializedPortfolio[];
    onAddETF: (ticker: string) => void;
    onRemoveETF: (ticker: string) => void;
    onUpdateAllocation: (ticker: string, value: number) => void;
    onBulkUpdateAllocations: (updates: AllocationUpdate[], overrideLocks: boolean) => void;
    onToggleLock: (ticker: string) => void;
    onToggleDisable: (ticker: string) => void;
    onInputChange: (ticker: string, value: number) => void;
    onInputBlur: (ticker: string) => void;
    onResetPortfolio: () => void;
    onSavePortfolio: () => void;
    onToggleDetailColumns: () => void;
    onDeletePortfolio: (portfolioName: string) => void;
    onUpdatePortfolio: (portfolio: Partial<Portfolio>, isTemplateLoad?: boolean, originalTemplate?: Portfolio | null) => void;
    onResetToTemplate?: () => void;
    isTemplateModified?: boolean;
}

type TabValue = 'build' | 'saved';

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
    // State for active tab and new portfolio name
    const [activeTab, setActiveTab] = useState<TabValue>('build');
    const [portfolioName, setPortfolioName] = useState(customPortfolio.name || '');

    // Sync portfolioName with customPortfolio.name when it changes
    useEffect(() => {
        setPortfolioName(customPortfolio.name);
    }, [customPortfolio.name]);

    /**
     * Load a portfolio (example or saved)
     */
    const loadPortfolio = (portfolio: Portfolio | SerializedPortfolio, isSaved = false): void => {
        try {
            // If it's a saved portfolio, it needs to be deserialized
            const portfolioToLoad = isSaved ? deserializePortfolio(portfolio as SerializedPortfolio) : (portfolio as Portfolio);

            // Convert the portfolio's holdings to the format used by the builder
            const newHoldings = new Map<string, Holding>();

            for (const [ticker, holding] of portfolioToLoad.holdings.entries()) {
                if (typeof holding === 'number') {
                    // Simple percentage (used by example portfolios)
                    newHoldings.set(ticker, {
                        percentage: holding,
                        locked: false,
                        disabled: false,
                    });
                } else {
                    // Full holding object (used by saved portfolios)
                    newHoldings.set(ticker, holding);
                }
            }

            // Update the portfolio with the loaded data
            const isTemplateLoad = !isSaved;
            onUpdatePortfolio(
                {
                    name: portfolioToLoad.name,
                    holdings: newHoldings,
                },
                isTemplateLoad,
                isTemplateLoad ? (portfolio as Portfolio) : null
            );

            // Set portfolio name for the input field
            setPortfolioName(portfolioToLoad.name);

            // Switch to the build tab after loading
            setActiveTab('build');
        } catch (error) {
            console.error('Error loading portfolio:', error);
            alert('There was an error loading the portfolio. Please try again.');
        }
    };

    const isPortfolioEmpty = customPortfolio.holdings.size === 0;

    // Check if portfolio is ready to be saved - use exact 100% check
    const isPortfolioValid = Math.abs(totalAllocation - 100) < 0.01 && customPortfolio.holdings.size > 0;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold">Portfolio Builder</h2>
                </div>
            </div>

            {/* Main tabbed interface */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
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

                {/* Build Tab */}
                <TabsContent value="build">
                    <div className="space-y-3">
                        {/* Template Selection Table */}
                        <TickerOrTemplateSelectionTable
                            mode="templates"
                            templates={examplePortfolios}
                            onSelect={(item) => loadPortfolio(item as Portfolio)}
                            title="Search Templates..."
                            etfCatalog={etfCatalog}
                        />

                        {/* Portfolio Allocations */}
                        <CompositionPanel
                            isPortfolioEmpty={isPortfolioEmpty}
                            setActiveTab={(tab: string) => setActiveTab(tab as TabValue)}
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
                            setShowPortfolioNameInput={() => {
                                /* Not used in this implementation */
                            }}
                            onResetToTemplate={onResetToTemplate}
                            isTemplateModified={isTemplateModified}
                        />

                        {/* ETF Selection */}
                        <TickerOrTemplateSelectionTable
                            etfCatalog={etfCatalog}
                            onSelect={(item) => onAddETF(item as string)}
                            existingTickers={Array.from(customPortfolio.holdings.keys())}
                        />
                    </div>
                </TabsContent>

                {/* Saved portfolios Tab */}
                <TabsContent value="saved">
                    <Card className="bg-gradient-to-br from-background to-muted/20 border border-border/40 py-0">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-medium mb-4">Your Saved Portfolios</h3>

                            {savedPortfolios.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <Folder className="h-12 w-12 text-muted-foreground/40 mb-3" />
                                    <h4 className="text-base font-medium mb-2">No Saved Portfolios</h4>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        You haven&apos;t saved any portfolios yet. Build a portfolio and save it to see it here.
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
                                                <h4 className="font-medium mb-1">{portfolio.name || 'Unnamed Portfolio'}</h4>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    {(portfolio as SerializedPortfolio & { description?: string }).description ||
                                                        (portfolio.createdAt
                                                            ? `Created on ${new Date(portfolio.createdAt).toLocaleDateString()}`
                                                            : 'No creation date available')}
                                                </p>
                                                <div className="text-xs text-muted-foreground mb-3">
                                                    {portfolio.etfCount || (portfolio.holdings ? portfolio.holdings.length : '?')} ETFs
                                                </div>
                                            </div>

                                            <div className="flex border-t border-border/40">
                                                <button
                                                    onClick={() => loadPortfolio(portfolio, true)}
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
