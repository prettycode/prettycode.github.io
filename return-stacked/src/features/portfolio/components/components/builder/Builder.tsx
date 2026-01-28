import React, { useState, useEffect, useRef } from 'react';
import type { Portfolio } from '@/features/portfolio/core/domain/Portfolio';
import type { ETF } from '@/features/portfolio/core/domain/ETF';
import type { SerializedPortfolio } from '@/features/portfolio/core/domain/SerializedPortfolio';
import type { Holding } from '@/features/portfolio/core/domain/Holding';
import { deserializePortfolio } from '@/features/portfolio/core/utils/Serialization';
import TickerOrTemplateSelectionTable from './TickerOrTemplateSelectionTable';
import CompositionPanel from './CompositionPanel';
import { Button } from '@/shared/components/ui/Button';
import { Download, Upload } from 'lucide-react';

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
    onUpdatePortfolio: (portfolio: Partial<Portfolio>, isTemplateLoad?: boolean, originalTemplate?: Portfolio | null) => void;
    onResetToTemplate?: () => void;
    isTemplateModified?: boolean;
    onExportPortfolio?: () => void;
    onImportPortfolio?: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
    onUpdatePortfolio,
    onResetToTemplate,
    isTemplateModified,
    onExportPortfolio,
    onImportPortfolio,
}) => {
    const [portfolioName, setPortfolioName] = useState(customPortfolio.name || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync portfolioName with customPortfolio.name when it changes
    useEffect(() => {
        setPortfolioName(customPortfolio.name);
    }, [customPortfolio.name]);

    /**
     * Load a portfolio (example or saved)
     */
    const loadPortfolio = (portfolio: Portfolio | SerializedPortfolio): void => {
        try {
            // Check if this is a SerializedPortfolio by checking if it has a 'version' field
            const isSaved = 'version' in portfolio;

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
                <div className="flex gap-2">
                    {onExportPortfolio && (
                        <Button
                            onClick={onExportPortfolio}
                            variant="outline"
                            size="sm"
                            className="h-8 cursor-pointer"
                            title="Export current portfolio as JSON"
                            disabled={customPortfolio.holdings.size === 0}
                        >
                            <Download className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                    )}
                    {onImportPortfolio && (
                        <>
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="outline"
                                size="sm"
                                className="h-8 cursor-pointer"
                                title="Import portfolio from JSON file"
                            >
                                <Upload className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Import</span>
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={onImportPortfolio}
                                className="hidden"
                                aria-label="Import portfolio file"
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Introduction Message */}
            {
                <div>
                    <h3 className="text-lg font-semibold mb-2 mt-5">Load a Portfolio</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Start from a template or saved portfolio by selecting one from the table below.
                    </p>
                    {/* Template and Saved Portfolios Selection Table */}
                    {
                        <TickerOrTemplateSelectionTable
                            mode="templates-and-saved"
                            templates={examplePortfolios}
                            savedPortfolios={savedPortfolios}
                            onSelect={(item) => loadPortfolio(item as Portfolio | SerializedPortfolio)}
                            title="Search Templates and Saved Portfolios..."
                            etfCatalog={etfCatalog}
                            initiallyExpanded={false}
                        />
                    }
                </div>
            }

            <h3 className="text-lg font-semibold mb-2 mt-5">Modify Portfolio Allocations</h3>
            <p className="text-sm text-muted-foreground mb-4">Change the portfolio composition using the controls below:</p>
            {/* Portfolio Allocations */}
            <CompositionPanel
                isPortfolioEmpty={isPortfolioEmpty}
                setActiveTab={() => {}}
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
                setShowPortfolioNameInput={() => {}}
                onResetToTemplate={onResetToTemplate}
                isTemplateModified={isTemplateModified}
                onLoadPortfolio={loadPortfolio}
                examplePortfolios={examplePortfolios}
                savedPortfolios={savedPortfolios}
            />

            {/* Introduction Message */}
            {
                <div>
                    <h3 className="text-lg font-semibold mb-2 mt-5">Add ETFs to Your Portfolio</h3>
                    <p className="text-sm text-muted-foreground mb-4">Add ETFs to your portfolio by selecting them from the table below.</p>
                    {/* Template and Saved Portfolios Selection Table */}
                    {
                        <TickerOrTemplateSelectionTable
                            etfCatalog={etfCatalog}
                            onSelect={(item) => onAddETF(item as string)}
                            existingTickers={Array.from(customPortfolio.holdings.keys())}
                        />
                    }
                </div>
            }
        </div>
    );
};

export default Builder;
