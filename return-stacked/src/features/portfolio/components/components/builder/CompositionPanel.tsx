import React, { useState } from 'react';
import type { Portfolio } from '@/features/portfolio/core/domain/Portfolio';
import type { ETF } from '@/features/portfolio/core/domain/ETF';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { AlertCircle, ChevronDown, ChevronUp, FolderOpen, RotateCcw, Save, Scale, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Switch } from '@/shared/components/ui/Switch';
import { cn } from '@/shared/lib/Utils';
import { percentToBasisPoints, basisPointsToPercent } from '@/features/portfolio/core/calculators/precision';
import HoldingsTable from './HoldingsTable';
import TickerOrTemplateSelectionTable from './TickerOrTemplateSelectionTable';

interface AllocationUpdate {
    ticker: string;
    percentage: number;
}

interface CompositionPanelProps {
    isPortfolioEmpty: boolean;
    setActiveTab: (tab: string) => void;
    customPortfolio: Portfolio;
    etfCatalog: ETF[];
    tempInputs: Record<string, number | undefined>;
    showDetailColumns: boolean;
    totalAllocation: number;
    isPortfolioValid: boolean;
    portfolioName: string;
    onToggleDetailColumns: () => void;
    onUpdateAllocation: (ticker: string, value: number) => void;
    onBulkUpdateAllocations: (updates: AllocationUpdate[], overrideLocks: boolean) => void;
    onToggleLock: (ticker: string) => void;
    onToggleDisable: (ticker: string) => void;
    onInputChange: (ticker: string, value: number) => void;
    onInputBlur: (ticker: string) => void;
    onRemoveETF: (ticker: string) => void;
    onResetPortfolio: () => void;
    onSavePortfolio: () => void;
    setShowPortfolioNameInput: (show: boolean) => void;
    onResetToTemplate?: () => void;
    isTemplateModified?: boolean;
    onLoadPortfolio?: (portfolio: any) => void;
    examplePortfolios?: any[];
    savedPortfolios?: any[];
}

// Animation duration for expand/collapse transition
const EXPAND_COLLAPSE_DURATION_MS = 300;

const CompositionPanel: React.FC<CompositionPanelProps> = ({
    isPortfolioEmpty,
    setActiveTab: _setActiveTab,
    customPortfolio,
    etfCatalog,
    tempInputs,
    showDetailColumns,
    totalAllocation: _totalAllocation,
    isPortfolioValid,
    portfolioName,
    onToggleDetailColumns,
    onUpdateAllocation,
    onBulkUpdateAllocations,
    onToggleLock,
    onToggleDisable,
    onInputChange,
    onInputBlur,
    onRemoveETF,
    onResetPortfolio,
    onSavePortfolio,
    setShowPortfolioNameInput,
    onResetToTemplate,
    isTemplateModified,
    onLoadPortfolio,
    examplePortfolios,
    savedPortfolios,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showPortfolioSelector, setShowPortfolioSelector] = useState(false);

    const toggleExpand = (): void => {
        setIsExpanded(!isExpanded);
    };

    /**
     * Handle Equal Weight (Unlocked) - distribute remaining percentage equally among unlocked, non-disabled holdings
     */
    const handleEqualWeightUnlocked = (): void => {
        if (isPortfolioEmpty) {
            return;
        }

        const holdings = Array.from(customPortfolio.holdings.entries());
        const unlockedActiveHoldings = holdings.filter(([_ticker, holding]) => !holding.locked && !holding.disabled);

        // If no unlocked active holdings, do nothing
        if (unlockedActiveHoldings.length === 0) {
            return;
        }

        // Calculate total basis points used by locked or disabled holdings
        const totalLockedOrDisabledBasisPoints = holdings
            .filter(([_ticker, holding]) => holding.locked || holding.disabled)
            .reduce((sum, [_ticker, holding]) => sum + (holding.basisPoints ?? percentToBasisPoints(holding.percentage)), 0);

        // Calculate remaining percentage to distribute
        const remainingPercentage = basisPointsToPercent(Math.max(0, 10000 - totalLockedOrDisabledBasisPoints));

        // Calculate target percentage for each unlocked active holding
        // Don't round here - let the basis points calculator handle precision
        const targetPercentage = remainingPercentage / unlockedActiveHoldings.length;

        // Create bulk update array for unlocked active holdings
        const allocationUpdates: AllocationUpdate[] = unlockedActiveHoldings.map(([ticker, _holding]) => ({
            ticker,
            percentage: targetPercentage,
        }));

        // Use bulk update without lock override - respects locked ETFs
        onBulkUpdateAllocations(allocationUpdates, false);
    };

    /**
     * Handle Equal Weight (All) - distribute 100% equally among all non-disabled holdings, overriding locks
     */
    const handleEqualWeightAll = (): void => {
        if (isPortfolioEmpty) {
            return;
        }

        const holdings = Array.from(customPortfolio.holdings.entries());
        const activeHoldings = holdings.filter(([_ticker, holding]) => !holding.disabled);

        // If no active holdings, do nothing
        if (activeHoldings.length === 0) {
            return;
        }

        // Calculate target percentage for each active holding
        // Don't round here - let the basis points calculator handle precision
        const targetPercentage = 100 / activeHoldings.length;

        // Create bulk update array for all active holdings
        const allocationUpdates: AllocationUpdate[] = activeHoldings.map(([ticker, _holding]) => ({
            ticker,
            percentage: targetPercentage,
        }));

        // Use bulk update with lock override - "Equal Weight (All)" ignores lock status!
        onBulkUpdateAllocations(allocationUpdates, true);
    };

    // Calculate helper values for button states
    const holdings = !isPortfolioEmpty ? Array.from(customPortfolio.holdings.entries()) : [];
    const unlockedActiveHoldings = holdings.filter(([_ticker, holding]) => !holding.locked && !holding.disabled);
    const activeHoldings = holdings.filter(([_ticker, holding]) => !holding.disabled);
    const hasMultipleUnlockedActiveHoldings = unlockedActiveHoldings.length >= 2;
    const hasMultipleActiveHoldings = activeHoldings.length >= 2;

    // Check if already at equal weight using basis points for exact comparison
    const isAlreadyEqualWeightAll =
        hasMultipleActiveHoldings &&
        ((): boolean => {
            const targetPercentage = 100 / activeHoldings.length;
            const targetBasisPoints = percentToBasisPoints(targetPercentage);
            return activeHoldings.every(([_ticker, holding]) => {
                const holdingBasisPoints = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
                // Allow 1 basis point (0.01%) difference for rounding
                return Math.abs(holdingBasisPoints - targetBasisPoints) <= 1;
            });
        })();

    const isAlreadyEqualWeightUnlocked =
        hasMultipleUnlockedActiveHoldings &&
        ((): boolean => {
            const totalLockedOrDisabledBasisPoints = holdings
                .filter(([_ticker, holding]) => holding.locked || holding.disabled)
                .reduce((sum, [_ticker, holding]) => sum + (holding.basisPoints ?? percentToBasisPoints(holding.percentage)), 0);
            const remainingBasisPoints = Math.max(0, 10000 - totalLockedOrDisabledBasisPoints);
            const targetBasisPoints = Math.round(remainingBasisPoints / unlockedActiveHoldings.length);
            return unlockedActiveHoldings.every(([_ticker, holding]) => {
                const holdingBasisPoints = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
                // Allow 1 basis point (0.01%) difference for rounding
                return Math.abs(holdingBasisPoints - targetBasisPoints) <= 1;
            });
        })();

    return (
        <>
            {isPortfolioEmpty ? (
                <div className="space-y-3">
                    <Card className="border border-border/40 py-0">
                        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[220px] text-center">
                            <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">This Portfolio is Empty</h3>
                            <p className="text-sm text-muted-foreground max-w-md mb-4">
                                Load a portfolio from templates or saved portfolios, or add ETFs individually.
                            </p>
                            {onLoadPortfolio && examplePortfolios && savedPortfolios && !showPortfolioSelector && (
                                <Button
                                    onClick={() => setShowPortfolioSelector(true)}
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer"
                                >
                                    <FolderOpen className="h-4 w-4 mr-2" />
                                    Load Portfolio
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                    {showPortfolioSelector && onLoadPortfolio && examplePortfolios && savedPortfolios && (
                        <div className="space-y-2">
                            <TickerOrTemplateSelectionTable
                                mode="templates-and-saved"
                                templates={examplePortfolios}
                                savedPortfolios={savedPortfolios}
                                onSelect={(item) => {
                                    onLoadPortfolio(item);
                                    setShowPortfolioSelector(false);
                                }}
                                title="Search Templates and Saved Portfolios..."
                                etfCatalog={etfCatalog}
                                initiallyExpanded={true}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <Card className="border shadow-sm py-0 gap-0 overflow-hidden">
                    <div className={cn('p-3 space-y-3', isExpanded ? 'border-b' : '')}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <h1 className="text-lg font-medium">{portfolioName}</h1>
                            </div>

                            <div className="flex items-center gap-2">
                                <div
                                    className={cn(
                                        'flex items-center gap-2 transition-opacity ease-in-out',
                                        isExpanded ? 'opacity-100' : 'opacity-0'
                                    )}
                                    style={{ transitionDuration: `${EXPAND_COLLAPSE_DURATION_MS}ms` }}
                                >
                                    <Switch
                                        checked={showDetailColumns}
                                        onCheckedChange={onToggleDetailColumns}
                                        className="data-[state=checked]:bg-blue-500"
                                    />
                                    <label className="text-xs text-muted-foreground cursor-pointer" onClick={onToggleDetailColumns}>
                                        <span className="hidden sm:inline-block">Detailed View</span>
                                        <span className="sm:hidden">Details</span>
                                    </label>
                                </div>

                                <Button variant="ghost" size="sm" onClick={toggleExpand} className="h-7 w-7 p-0 cursor-pointer">
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div
                        className={cn('overflow-hidden transition-all ease-in-out', isExpanded ? 'max-h-[800px]' : 'max-h-0')}
                        style={{ transitionDuration: `${EXPAND_COLLAPSE_DURATION_MS}ms` }}
                    >
                        <HoldingsTable
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
                        <div className="p-3 border-t bg-muted/10">
                            <div className="flex items-center justify-between">
                                {/* Left side - Portfolio manipulation actions */}
                                <div className="flex items-center gap-2">
                                    <Button onClick={onResetPortfolio} variant="outline" size="sm" className="text-xs h-8 cursor-pointer">
                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                        <span>Remove all</span>
                                    </Button>

                                    {onResetToTemplate && (
                                        <Button
                                            onClick={onResetToTemplate}
                                            disabled={!isTemplateModified}
                                            variant="outline"
                                            size="sm"
                                            className={cn('text-xs h-8', isTemplateModified ? 'cursor-pointer' : 'cursor-not-allowed')}
                                            title={
                                                isTemplateModified
                                                    ? 'Reset to original template'
                                                    : 'Portfolio has not been modified from template'
                                            }
                                        >
                                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                            <span>Reset Template</span>
                                        </Button>
                                    )}

                                    <Button
                                        onClick={handleEqualWeightUnlocked}
                                        disabled={!hasMultipleUnlockedActiveHoldings || isAlreadyEqualWeightUnlocked}
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'text-xs h-8',
                                            hasMultipleUnlockedActiveHoldings && !isAlreadyEqualWeightUnlocked
                                                ? 'cursor-pointer'
                                                : 'cursor-not-allowed'
                                        )}
                                        title={
                                            !hasMultipleUnlockedActiveHoldings
                                                ? 'Requires 2+ unlocked, active ETFs'
                                                : isAlreadyEqualWeightUnlocked
                                                  ? 'Already at equal weight'
                                                  : 'Distribute remaining portfolio equally among unlocked, active ETFs'
                                        }
                                    >
                                        <Scale className="h-3.5 w-3.5 mr-1" />
                                        <span>EW (Unlocked)</span>
                                    </Button>

                                    <Button
                                        onClick={handleEqualWeightAll}
                                        disabled={!hasMultipleActiveHoldings || isAlreadyEqualWeightAll}
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'text-xs h-8',
                                            hasMultipleActiveHoldings && !isAlreadyEqualWeightAll ? 'cursor-pointer' : 'cursor-not-allowed'
                                        )}
                                        title={
                                            !hasMultipleActiveHoldings
                                                ? 'Requires 2+ active ETFs'
                                                : isAlreadyEqualWeightAll
                                                  ? 'Already at equal weight'
                                                  : 'Distribute 100% equally among all active ETFs'
                                        }
                                    >
                                        <Scale className="h-3.5 w-3.5 mr-1" />
                                        <span>EW (Unlocked & Locked)</span>
                                    </Button>
                                </div>

                                {/* Right side - Portfolio persistence actions */}
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
                                    className={cn('text-xs h-8', isPortfolioValid ? 'cursor-pointer' : 'cursor-not-allowed')}
                                >
                                    <Save className="h-3.5 w-3.5 mr-1" />
                                    <span>Save&hellip;</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </>
    );
};

export default CompositionPanel;
