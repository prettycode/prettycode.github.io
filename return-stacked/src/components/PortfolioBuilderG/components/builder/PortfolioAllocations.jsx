import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    AlertCircle,
    BookTemplate,
    EyeOff,
    Eye,
    Percent,
    Trash2,
    Save,
    ChevronDown,
    ChevronUp,
    Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PortfolioTable from './PortfolioTable';
import { analyzePortfolio } from '../../utils/etfData';

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
    const [isExpanded, setIsExpanded] = useState(true);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Calculate total leverage using analyzePortfolio
    const { totalLeverage = 0 } = !isPortfolioEmpty ? analyzePortfolio(customPortfolio) : { totalLeverage: 0 };

    // Determine color based on leverage level
    const getLeverageColor = (leverage) => {
        if (leverage < 1.5) return 'bg-green-100 text-green-800';
        if (leverage < 2) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
    };

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
                        <Button
                            onClick={() => setActiveTab('templates')}
                            className="flex items-center gap-1"
                            variant="default"
                            size="sm"
                        >
                            <BookTemplate className="h-4 w-4 mr-1" />
                            <span>Browse Templates</span>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border shadow-sm py-0 gap-0 overflow-hidden">
                    <div className={cn('p-3 space-y-3', isExpanded ? 'border-b' : '')}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-medium">Asset Allocation</h3>

                                {/* Leverage indicator instead of allocation percentage */}
                                <div
                                    className={cn(
                                        'px-2.5 py-0.5 rounded-full text-xs flex items-center',
                                        getLeverageColor(totalLeverage)
                                    )}
                                >
                                    <Layers className="h-3 w-3 mr-1" />
                                    <span>{totalLeverage.toFixed(2)}x</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={onToggleDetailColumns}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs cursor-pointer"
                                >
                                    {showDetailColumns ? (
                                        <>
                                            <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                                            <span className="hidden sm:inline-block">Hide Details</span>
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                                            <span className="hidden sm:inline-block">Show Details</span>
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleExpand}
                                    className="h-7 w-7 p-0 cursor-pointer"
                                >
                                    {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div
                        className={cn(
                            'overflow-hidden transition-all duration-300 ease-in-out',
                            isExpanded ? 'max-h-[800px]' : 'max-h-0'
                        )}
                    >
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
                        <div className="flex items-center justify-between p-3 border-t bg-muted/10">
                            <Button
                                onClick={onResetPortfolio}
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 cursor-pointer"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                <span>Clear All</span>
                            </Button>

                            <Button
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
                                variant={isPortfolioValid ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                    'text-xs h-8',
                                    isPortfolioValid ? 'cursor-pointer' : 'cursor-not-allowed'
                                )}
                            >
                                <Save className="h-3.5 w-3.5 mr-1" />
                                <span>Save Portfolio</span>
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </>
    );
};

export default PortfolioAllocations;
