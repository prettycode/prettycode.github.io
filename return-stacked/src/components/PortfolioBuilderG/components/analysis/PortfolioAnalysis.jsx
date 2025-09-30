import React, { useState } from 'react';
import AssetClassExposureBar from './AssetClassExposureBar';
import CompactExposureCard from './CompactExposureCard';
import DetailedExposuresVisual, { ViewToggle } from './DetailedExposuresVisual';
import { Card, CardContent } from '@/components/ui/card';
import {
    Layers,
    AlertCircle,
    BarChart3,
    SlidersHorizontal,
    Percent,
    ArrowDown10,
    Filter,
    LayoutGrid,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Portfolio Analysis component with modern UI
const PortfolioAnalysis = ({ portfolio }) => {
    // Shared state for sorting that affects both components
    const [sortByValue, setSortByValue] = useState(false);
    const [showRelative, setShowRelative] = useState(true);
    const [hideZeroValues, setHideZeroValues] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [useCompactView, setUseCompactView] = useState(true);

    // Shared state for expanded categories that persists between view modes
    const [expandedCategories, setExpandedCategories] = useState({
        assetClass: true,
        marketRegion: true,
        factorStyle: true,
        sizeFactor: true,
    });

    // Handle changes to sort preference
    const handleSortChange = (newSortValue) => {
        setSortByValue(newSortValue);
    };

    // Handle toggling expanded state for categories
    const toggleExpandedCategory = (category) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    // Check if portfolio is empty
    const isPortfolioEmpty = portfolio.holdings.size === 0;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                    <h2 className="text-lg font-bold">Portfolio Analysis</h2>
                </div>

                {!isPortfolioEmpty && (
                    <button
                        onClick={() => setShowControls(!showControls)}
                        className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <SlidersHorizontal className="h-3 w-3" />
                        <span className="hidden sm:inline-block">
                            {showControls ? 'Hide View Options' : 'Show View Options'}
                        </span>
                    </button>
                )}
            </div>

            {!isPortfolioEmpty && showControls && (
                <div className="flex flex-wrap items-center gap-3 py-1.5 rounded-md -mt-1 mb-1">
                    <ViewToggle
                        label={showRelative ? 'Relative' : 'Absolute'}
                        icon={<Percent className="h-3 w-3 text-muted-foreground" />}
                        isChecked={!showRelative}
                        onChange={() => setShowRelative(!showRelative)}
                    />
                    <ViewToggle
                        label={sortByValue ? 'Sort by Value' : 'Fixed Order'}
                        icon={<ArrowDown10 className="h-3 w-3 text-muted-foreground" />}
                        isChecked={sortByValue}
                        onChange={handleSortChange}
                    />
                    <ViewToggle
                        label={hideZeroValues ? 'Hide Zeros' : 'Show All'}
                        icon={<Filter className="h-3 w-3 text-muted-foreground" />}
                        isChecked={hideZeroValues}
                        onChange={() => setHideZeroValues(!hideZeroValues)}
                    />
                    <ViewToggle
                        label={useCompactView ? 'Compact View' : 'Detailed View'}
                        icon={<LayoutGrid className="h-3 w-3 text-muted-foreground" />}
                        isChecked={useCompactView}
                        onChange={() => setUseCompactView(!useCompactView)}
                    />
                </div>
            )}

            {isPortfolioEmpty ? (
                <Card className="border border-border/40">
                    <CardContent className="p-4 flex flex-col items-center justify-center h-[180px] text-center">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/60 mb-2" />
                        <h3 className="text-base font-medium text-foreground mb-1">No Portfolio Data</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Select ETFs or load a portfolio template to start building your portfolio.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    <AssetClassExposureBar
                        portfolio={portfolio}
                        sortByValue={sortByValue}
                        showRelative={showRelative}
                    />
                    {/*useCompactView && (
                        <CompactExposureCard
                            portfolio={portfolio}
                            sortByValue={sortByValue}
                            showRelative={showRelative}
                            hideZeroValues={hideZeroValues}
                        />
                    )*/}
                    <DetailedExposuresVisual
                        portfolio={portfolio}
                        onSortChange={handleSortChange}
                        showRelative={showRelative}
                        hideZeroValues={hideZeroValues}
                        sortByValue={sortByValue}
                        useCompactView={useCompactView}
                        expandedCategories={expandedCategories}
                        onToggleCategory={toggleExpandedCategory}
                    />
                </div>
            )}
        </div>
    );
};

export default PortfolioAnalysis;
