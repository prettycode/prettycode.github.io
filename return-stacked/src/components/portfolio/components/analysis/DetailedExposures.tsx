import React from 'react';
import { analyzePortfolio, parseExposureKey, assetClassColors } from '../../utils/etfData';
import { weightToPercent, calculateRelativePercent } from '../../utils/precisionUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import ExposureCard from './ExposureCard';
import type { Portfolio, ColorMap, AssetClass, MarketRegion, FactorStyle, SizeFactor } from '@/types/portfolio';

interface ExpandedCategories {
    assetClass: boolean;
    marketRegion: boolean;
    factorStyle: boolean;
    sizeFactor: boolean;
}

interface DetailedExposuresProps {
    portfolio: Portfolio;
    onSortChange?: (sortByValue: boolean) => void;
    showRelative?: boolean;
    hideZeroValues?: boolean;
    sortByValue?: boolean;
    useCompactView?: boolean;
    expandedCategories?: ExpandedCategories;
    onToggleCategory?: (category: keyof ExpandedCategories) => void;
}

interface ViewToggleProps {
    label: string;
    icon: React.ReactNode;
    isChecked: boolean;
    onChange: (checked: boolean) => void;
}

interface DetailedExposureCardProps {
    id: keyof ExpandedCategories;
    title: string;
    icon?: React.ReactNode;
    exposuresAbs: Map<string, number>;
    exposuresRel: Map<string, number>;
    colors: ColorMap;
}

/**
 * Component to display detailed exposures with compact modern visualization
 */
const DetailedExposures: React.FC<DetailedExposuresProps> = ({
    portfolio,
    onSortChange: _onSortChange,
    showRelative = true,
    hideZeroValues = false,
    sortByValue = false,
    useCompactView = true,
    expandedCategories = {
        assetClass: true,
        marketRegion: true,
        factorStyle: true,
        sizeFactor: true,
    },
    onToggleCategory,
}) => {
    const { exposures } = analyzePortfolio(portfolio);

    // Define all possible values for each dimension
    const allAssetClasses: AssetClass[] = ['Equity', 'U.S. Treasuries', 'Managed Futures', 'Futures Yield', 'Gold', 'Bitcoin'];
    const allMarketRegions: MarketRegion[] = ['U.S.', 'International Developed', 'Emerging'];
    const allFactorStyles: FactorStyle[] = ['Blend', 'Value', 'Growth'];
    const allSizeFactors: SizeFactor[] = ['Large Cap', 'Small Cap'];

    // Initialize maps for absolute values with all possible values set to 0
    const assetClassExposuresAbs = new Map<string, number>();
    const marketRegionExposuresAbs = new Map<string, number>();
    const factorStyleExposuresAbs = new Map<string, number>();
    const sizeFactorExposuresAbs = new Map<string, number>();

    // Initialize all maps with zeros
    for (const assetClass of allAssetClasses) {
        assetClassExposuresAbs.set(assetClass, 0);
    }

    for (const region of allMarketRegions) {
        marketRegionExposuresAbs.set(region, 0);
    }

    for (const style of allFactorStyles) {
        factorStyleExposuresAbs.set(style, 0);
    }

    for (const size of allSizeFactors) {
        sizeFactorExposuresAbs.set(size, 0);
    }

    // Process the exposures to get absolute values first
    for (const [key, amount] of exposures.entries()) {
        const { assetClass, marketRegion, factorStyle, sizeFactor } = parseExposureKey(key);

        // Calculate absolute amount (as percentage of portfolio)
        const absAmount = weightToPercent(amount);

        // Add to asset class exposures
        const currentAssetAmount = assetClassExposuresAbs.get(assetClass) || 0;
        assetClassExposuresAbs.set(assetClass, currentAssetAmount + absAmount);

        // Add to market region exposures (only for Equity)
        if (assetClass === 'Equity' && marketRegion) {
            const currentRegionAmount = marketRegionExposuresAbs.get(marketRegion) || 0;
            marketRegionExposuresAbs.set(marketRegion, currentRegionAmount + absAmount);
        }

        // Add to factor style exposures (only for Equity)
        if (assetClass === 'Equity' && factorStyle) {
            const currentStyleAmount = factorStyleExposuresAbs.get(factorStyle) || 0;
            factorStyleExposuresAbs.set(factorStyle, currentStyleAmount + absAmount);
        }

        // Add to size factor exposures (only for Equity)
        if (assetClass === 'Equity' && sizeFactor) {
            const currentSizeAmount = sizeFactorExposuresAbs.get(sizeFactor) || 0;
            sizeFactorExposuresAbs.set(sizeFactor, currentSizeAmount + absAmount);
        }
    }

    // Now calculate relative values correctly for each category

    // For Asset Classes, relative to total leverage
    const assetClassExposuresRel = new Map<string, number>();
    let totalAssetExposure = 0;
    for (const amount of assetClassExposuresAbs.values()) {
        totalAssetExposure += amount;
    }

    for (const [assetClass, amount] of assetClassExposuresAbs.entries()) {
        assetClassExposuresRel.set(assetClass, calculateRelativePercent(amount, totalAssetExposure));
    }

    // For Market Regions, relative to total market exposure
    const marketRegionExposuresRel = new Map<string, number>();
    let totalMarketExposure = 0;
    for (const amount of marketRegionExposuresAbs.values()) {
        totalMarketExposure += amount;
    }

    for (const [region, amount] of marketRegionExposuresAbs.entries()) {
        marketRegionExposuresRel.set(region, calculateRelativePercent(amount, totalMarketExposure));
    }

    // For Factor Styles, relative to total factor style exposure
    const factorStyleExposuresRel = new Map<string, number>();
    let totalStyleExposure = 0;
    for (const amount of factorStyleExposuresAbs.values()) {
        totalStyleExposure += amount;
    }

    for (const [style, amount] of factorStyleExposuresAbs.entries()) {
        factorStyleExposuresRel.set(style, calculateRelativePercent(amount, totalStyleExposure));
    }

    // For Size Factors, relative to total size factor exposure
    const sizeFactorExposuresRel = new Map<string, number>();
    let totalSizeExposure = 0;
    for (const amount of sizeFactorExposuresAbs.values()) {
        totalSizeExposure += amount;
    }

    for (const [size, amount] of sizeFactorExposuresAbs.entries()) {
        sizeFactorExposuresRel.set(size, calculateRelativePercent(amount, totalSizeExposure));
    }

    // Get the equity blue color from assetClassColors
    const equityBlue = assetClassColors.Equity;

    // Create dimension-specific colors all using equity blue
    const factorStyleColors: ColorMap = {
        Blend: equityBlue,
        Value: equityBlue,
        Growth: equityBlue,
    };

    const sizeFactorColors: ColorMap = {
        'Large Cap': equityBlue,
        'Small Cap': equityBlue,
    };

    // Create a map with all market regions using equity blue
    const marketRegionColors: ColorMap = {
        'U.S.': equityBlue,
        'International Developed': equityBlue,
        Emerging: equityBlue,
    };

    /**
     * Toggle category expansion
     */
    const toggleCategory = (category: keyof ExpandedCategories): void => {
        if (onToggleCategory) {
            onToggleCategory(category);
        }
    };

    // Name mapping objects for each exposure type
    const marketRegionNameMapping: Record<string, string> = {
        'U.S.': 'US',
        'International Developed': "Int'l",
        Emerging: 'EM',
    };

    const factorStyleNameMapping: Record<string, string> = {
        Blend: 'Blend',
        Value: 'Value',
        Growth: 'Growth',
    };

    const sizeFactorNameMapping: Record<string, string> = {
        'Large Cap': 'Large',
        'Small Cap': 'Small',
    };

    /**
     * Helper component for exposure category (original style for Asset Class)
     */
    const DetailedExposureCard: React.FC<DetailedExposureCardProps> = ({ id, title, icon, exposuresAbs, exposuresRel, colors }) => {
        // Determine which exposure set to use based on the shared toggle
        const exposuresToUse = showRelative ? exposuresRel : exposuresAbs;

        // Convert to array and prepare for display
        let exposureItems = Array.from(exposuresToUse.entries());

        // Apply sorting if enabled, otherwise maintain original order
        if (sortByValue) {
            exposureItems = exposureItems.sort((a, b) => b[1] - a[1]);
        }

        // Filter out zero values if hideZeroValues is enabled
        if (hideZeroValues) {
            exposureItems = exposureItems.filter(([_, value]) => value > 0);
        }

        // Check if we should show this category
        const isExpanded = expandedCategories[id];
        const hasNonZeroValues = exposureItems.some(([_, value]) => value > 0);

        if (hideZeroValues && !hasNonZeroValues) {
            return null;
        }

        return (
            <Card className="overflow-hidden border shadow-sm gap-0 py-3">
                <CardHeader
                    className={cn('cursor-pointer py-0 px-4 flex flex-row items-center justify-between')}
                    onClick={() => toggleCategory(id)}
                >
                    <div className="flex items-center space-x-1.5">
                        {icon}
                        <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </div>
                </CardHeader>

                {isExpanded && (
                    <CardContent className="py-3 pb-2 px-4">
                        <div className="space-y-2">
                            {exposureItems.length > 0 ? (
                                exposureItems.map(([name, value], index) => (
                                    <div key={index} className={cn('space-y-1')}>
                                        <div className="flex justify-between font-medium">
                                            <span className="text-xs">{name}</span>
                                            <span
                                                className="text-xs cursor-help"
                                                title={`${value.toFixed(4)}% (${showRelative ? 'relative' : 'absolute'})`}
                                            >
                                                {value.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="relative h-1.5">
                                            <Progress
                                                value={Math.min(value, 100)}
                                                className="h-1.5 absolute w-full"
                                                indicatorClassName={cn('transition-all', {
                                                    'bg-gradient-to-r from-blue-500 to-blue-600': !colors[name],
                                                })}
                                                style={
                                                    {
                                                        '--progress-background': colors[name] || '#3b82f6',
                                                    } as React.CSSProperties
                                                }
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-muted-foreground italic">No exposures to display</div>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>
        );
    };

    return (
        <div className="space-y-2">
            {useCompactView ? (
                <>
                    <ExposureCard
                        title="Asset Class Exposure"
                        dataAbs={assetClassExposuresAbs}
                        dataRel={assetClassExposuresRel}
                        colors={assetClassColors}
                        nameMapping={{}}
                        showBadge={false}
                        sortByValue={sortByValue}
                        showRelative={showRelative}
                        hideZeroValues={hideZeroValues}
                        collapsible={true}
                        isExpanded={expandedCategories.assetClass}
                        onToggleExpanded={() => toggleCategory('assetClass')}
                    />

                    <ExposureCard
                        title="Market Exposure"
                        dataAbs={marketRegionExposuresAbs}
                        dataRel={marketRegionExposuresRel}
                        colors={marketRegionColors}
                        nameMapping={marketRegionNameMapping}
                        showBadge={false}
                        sortByValue={sortByValue}
                        showRelative={showRelative}
                        hideZeroValues={hideZeroValues}
                        collapsible={true}
                        isExpanded={expandedCategories.marketRegion}
                        onToggleExpanded={() => toggleCategory('marketRegion')}
                    />

                    <ExposureCard
                        title="Factor Style Exposure"
                        dataAbs={factorStyleExposuresAbs}
                        dataRel={factorStyleExposuresRel}
                        colors={factorStyleColors}
                        nameMapping={factorStyleNameMapping}
                        showBadge={false}
                        sortByValue={sortByValue}
                        showRelative={showRelative}
                        hideZeroValues={hideZeroValues}
                        collapsible={true}
                        isExpanded={expandedCategories.factorStyle}
                        onToggleExpanded={() => toggleCategory('factorStyle')}
                    />

                    <ExposureCard
                        title="Size Factor Exposure"
                        dataAbs={sizeFactorExposuresAbs}
                        dataRel={sizeFactorExposuresRel}
                        colors={sizeFactorColors}
                        nameMapping={sizeFactorNameMapping}
                        showBadge={false}
                        sortByValue={sortByValue}
                        showRelative={showRelative}
                        hideZeroValues={hideZeroValues}
                        collapsible={true}
                        isExpanded={expandedCategories.sizeFactor}
                        onToggleExpanded={() => toggleCategory('sizeFactor')}
                    />
                </>
            ) : (
                <>
                    <DetailedExposureCard
                        id="assetClass"
                        title="Asset Class Exposure"
                        exposuresAbs={assetClassExposuresAbs}
                        exposuresRel={assetClassExposuresRel}
                        colors={assetClassColors}
                    />

                    <DetailedExposureCard
                        id="marketRegion"
                        title="Market Exposure"
                        exposuresAbs={marketRegionExposuresAbs}
                        exposuresRel={marketRegionExposuresRel}
                        colors={marketRegionColors}
                    />

                    <DetailedExposureCard
                        id="factorStyle"
                        title="Factor Style Exposure"
                        exposuresAbs={factorStyleExposuresAbs}
                        exposuresRel={factorStyleExposuresRel}
                        colors={factorStyleColors}
                    />

                    <DetailedExposureCard
                        id="sizeFactor"
                        title="Size Factor Exposure"
                        exposuresAbs={sizeFactorExposuresAbs}
                        exposuresRel={sizeFactorExposuresRel}
                        colors={sizeFactorColors}
                    />
                </>
            )}
        </div>
    );
};

/**
 * Toggle component for view options
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({ label, icon, isChecked, onChange }): React.ReactElement => (
    <div className="flex items-center space-x-1.5 px-1.5 py-1 rounded-sm hover:bg-muted">
        {icon}
        <Label htmlFor={`toggle-${label}`} className="text-[10px] cursor-pointer">
            {label}
        </Label>
        <Switch
            id={`toggle-${label}`}
            checked={isChecked}
            onCheckedChange={onChange}
            className="data-[state=checked]:bg-primary h-[16px] w-[28px]"
        />
    </div>
);

export default DetailedExposures;
