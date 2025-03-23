import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, BookTemplate, EyeOff, Eye, Percent, Trash2, Save } from 'lucide-react';
import PortfolioTable from './PortfolioTable';

const PortfolioAllocations = ({
    isPortfolioEmpty,
    setActiveTab,
    customPortfolio,
    etfCatalog,
    tempInputs,
    showDetailColumns,
    totalAllocation,
    isPortfolioValid,
    portfolioName,
    onToggleDetailColumns,
    onUpdateAllocation,
    onToggleLock,
    onToggleDisable,
    onInputChange,
    onInputBlur,
    onRemoveETF,
    onResetPortfolio,
    onSavePortfolio,
    setShowPortfolioNameInput,
}) => {
    return (
        <>
            {isPortfolioEmpty ? (
                <Card className="bg-gradient-to-br from-muted/30 to-muted/10 border border-border/40 py-0">
                    <CardContent className="p-6 flex flex-col items-center justify-center h-[220px] text-center">
                        <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">Your Portfolio is Empty</h3>
                        <p className="text-sm text-muted-foreground max-w-md mb-4">
                            Start by adding ETFs above or switch to the Templates tab to use a pre-built portfolio.
                        </p>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            <BookTemplate className="h-4 w-4 mr-1" />
                            <span>Browse Templates</span>
                        </button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border border-border/40 py-0">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-1">
                                <h3 className="text-sm font-medium">Portfolio Allocations</h3>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Allocation status indicator */}
                                <div
                                    className={`px-2.5 py-0.5 rounded-full text-xs flex items-center ${
                                        Math.abs(totalAllocation - 100) <= 0.1
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-amber-100 text-amber-800'
                                    }`}
                                >
                                    <Percent className="h-3 w-3 mr-1" />
                                    <span>{totalAllocation.toFixed(1)}%</span>
                                </div>

                                <button
                                    onClick={onToggleDetailColumns}
                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showDetailColumns ? (
                                        <>
                                            <EyeOff className="h-3 w-3" />
                                            <span className="hidden sm:inline-block">Hide Details</span>
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="h-3 w-3" />
                                            <span className="hidden sm:inline-block">Show Details</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <PortfolioTable
                            customPortfolio={customPortfolio}
                            etfCatalog={etfCatalog}
                            tempInputs={tempInputs}
                            showDetailColumns={showDetailColumns}
                            onUpdateAllocation={onUpdateAllocation}
                            onToggleLock={onToggleLock}
                            onToggleDisable={onToggleDisable}
                            onInputChange={onInputChange}
                            onInputBlur={onInputBlur}
                            onRemoveETF={onRemoveETF}
                        />

                        {/* Action buttons */}
                        <div className="flex items-center justify-between mt-4">
                            <button
                                onClick={onResetPortfolio}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Trash2 className="h-3 w-3" />
                                <span>Clear All</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (isPortfolioValid) {
                                        if (!portfolioName.trim()) {
                                            setShowPortfolioNameInput(true);
                                        } else {
                                            onSavePortfolio();
                                        }
                                    }
                                }}
                                disabled={!isPortfolioValid}
                                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md 
                                    ${
                                        isPortfolioValid
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                                    } transition-colors`}
                            >
                                <Save className="h-3 w-3" />
                                <span>Save Portfolio</span>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );
};

export default PortfolioAllocations;
