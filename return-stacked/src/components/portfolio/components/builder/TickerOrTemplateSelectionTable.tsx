import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Portfolio } from '@/core/domain/Portfolio';
import type { ETF } from '@/core/domain/ETF';
import type { AssetClass } from '@/core/domain/AssetClass';
import type { TemplateDetails } from '@/core/domain/TemplateDetails';
import type { SerializedPortfolio } from '@/core/domain/SerializedPortfolio';
import { parseExposureKey } from '@/core/utils/exposureKeys';
import { AnalysisService } from '@/core/services/AnalysisService';
import { percentToWeight, roundToWholePercent, calculateRelativePercent } from '@/core/calculators/precision';
import { deserializePortfolio } from '@/core/utils/serialization';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchIcon, FilterIcon, ChevronDown, ChevronUp, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TickerOrTemplateSelectionTableProps {
    etfCatalog: ETF[];
    onSelect: (item: string | Portfolio | SerializedPortfolio) => void;
    existingTickers?: string[];
    mode?: 'etfs' | 'templates' | 'saved' | 'templates-and-saved';
    templates?: Portfolio[];
    savedPortfolios?: SerializedPortfolio[];
    title?: string;
    initiallyExpanded?: boolean;
}

interface LeverageTypeAllocation {
    type: string;
    allocation: number;
}

interface UnifiedItem {
    id: string;
    name: string;
    type: 'etf' | 'template';
    source?: 'template' | 'saved'; // Only applicable for template type
    leverageType: string;
    leverageTypesByAllocation?: LeverageTypeAllocation[];
    totalLeverage: number;
    exposures: Map<string, number>;
    template?: Portfolio;
    details?: TemplateDetails;
    etf?: ETF;
}

interface RegionalBreakdown {
    us: number;
    intl: number;
    em: number;
    total: number;
}

type SortColumn = string | '';
type SortDirection = 'asc' | 'desc';

const TickerOrTemplateSelectionTable: React.FC<TickerOrTemplateSelectionTableProps> = ({
    etfCatalog,
    onSelect,
    existingTickers = [],
    mode = 'etfs',
    templates = [],
    savedPortfolios = [],
    title = 'Search ETFs...',
    initiallyExpanded = true,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTab, setSelectedTab] = useState('all');
    const [selectedAssetClassFilter, setSelectedAssetClassFilter] = useState('all');
    const [selectedSourceFilter, setSelectedSourceFilter] = useState<'all' | 'template' | 'saved'>('all');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [sortColumn, setSortColumn] = useState<SortColumn>('ticker');
    const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * Calculate total exposure for an ETF
     */
    const calculateTotalExposure = (etf: { exposures: Map<string, number> }, asNumber = false): number | string => {
        let total = 0;
        for (const amount of etf.exposures.values()) {
            total += amount;
        }
        return asNumber ? total : total.toFixed(1);
    };

    /**
     * Check if leverage is effectively 1.0x (within floating point tolerance)
     */
    const isEffectivelyOneX = (leverage: number): boolean => {
        const tolerance = 0.001; // 0.1% tolerance for floating point precision
        return Math.abs(leverage - 1.0) < tolerance;
    };

    // Prepare unified data based on mode
    const items: UnifiedItem[] = useMemo(() => {
        /**
         * Calculate leverage types by allocation for templates
         */
        const calculateLeverageTypesByAllocation = (template: Portfolio): LeverageTypeAllocation[] => {
            const leverageTypes = new Map<string, number>();

            for (const [ticker, holding] of template.holdings) {
                const etf = etfCatalog.find((e) => e.ticker === ticker);
                if (!etf) {
                    continue;
                }

                const percentage = typeof holding === 'number' ? holding : holding.percentage;
                const leverageType = etf.leverageType === 'None' ? 'Unlevered' : etf.leverageType;
                const currentAllocation = leverageTypes.get(leverageType) || 0;
                leverageTypes.set(leverageType, currentAllocation + percentage);
            }

            // Sort by allocation (highest to lowest)
            return Array.from(leverageTypes.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([type, allocation]) => ({ type, allocation }));
        };

        if (mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved') {
            const allItems: UnifiedItem[] = [];

            // Add templates if in templates or combined mode
            if (mode === 'templates' || mode === 'templates-and-saved') {
                const analysisService = new AnalysisService();
                templates.forEach((template) => {
                    const details = analysisService.getTemplateDetails(template);
                    const leverageTypesByAllocation = calculateLeverageTypesByAllocation(template);

                    allItems.push({
                        id: `template-${template.name}`,
                        name: template.name,
                        type: 'template' as const,
                        source: 'template' as const,
                        leverageType: details.isLevered ? 'Mixed' : 'None',
                        leverageTypesByAllocation: leverageTypesByAllocation,
                        totalLeverage: details.totalLeverage,
                        exposures: details.analysis.assetClasses,
                        template: template,
                        details: details,
                    });
                });
            }

            // Add saved portfolios if in saved or combined mode
            if (mode === 'saved' || mode === 'templates-and-saved') {
                const analysisService = new AnalysisService();
                savedPortfolios
                    .map((sp) => deserializePortfolio(sp))
                    .forEach((template) => {
                        const details = analysisService.getTemplateDetails(template);
                        const leverageTypesByAllocation = calculateLeverageTypesByAllocation(template);

                        allItems.push({
                            id: `saved-${template.name}`,
                            name: template.name,
                            type: 'template' as const,
                            source: 'saved' as const,
                            leverageType: details.isLevered ? 'Mixed' : 'None',
                            leverageTypesByAllocation: leverageTypesByAllocation,
                            totalLeverage: details.totalLeverage,
                            exposures: details.analysis.assetClasses,
                            template: template,
                            details: details,
                        });
                    });
            }

            return allItems;
        } else {
            return etfCatalog.map((etf) => ({
                id: etf.ticker,
                name: etf.ticker,
                type: 'etf' as const,
                leverageType: etf.leverageType,
                totalLeverage: calculateTotalExposure({ exposures: etf.exposures }, true) as number,
                exposures: etf.exposures,
                etf: etf,
            }));
        }
    }, [mode, templates, savedPortfolios, etfCatalog]);

    // Get unique leverage types for tabs
    const leverageTypes = useMemo(() => {
        if (mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved') {
            return ['All', 'Levered', 'Unlevered'];
        } else {
            return ['All', ...new Set(etfCatalog.map((etf) => (etf.leverageType === 'None' ? 'Unlevered' : etf.leverageType)))];
        }
    }, [mode, etfCatalog]);

    // Get all unique asset classes from all ETFs
    const assetClasses = useMemo(() => {
        const classes = new Set<string>();

        etfCatalog.forEach((etf) => {
            for (const [key] of etf.exposures) {
                const { assetClass } = parseExposureKey(key);
                classes.add(assetClass);
            }
        });

        // Define preferred order of asset classes rather than alphabetical
        const preferredOrder: AssetClass[] = ['Equity', 'U.S. Treasuries', 'Managed Futures', 'Futures Yield', 'Gold', 'Bitcoin'];

        // Filter the classes that exist in our data and maintain preferred order
        const orderedClasses = preferredOrder.filter((cls) => classes.has(cls));

        // Add any classes not in our preferred order list (for future-proofing)
        Array.from(classes).forEach((cls) => {
            if (!orderedClasses.includes(cls as AssetClass)) {
                orderedClasses.push(cls as AssetClass);
            }
        });

        return orderedClasses;
    }, [etfCatalog]);

    // Auto-expand when user starts typing
    useEffect(() => {
        if (searchTerm.length > 0 && !isExpanded) {
            setIsExpanded(true);
        }
    }, [searchTerm, isExpanded]);

    /**
     * Get display name for asset classes
     */
    const getAssetClassDisplayName = (assetClass: string): string => {
        switch (assetClass) {
            case 'Managed Futures':
                return 'Trend';
            case 'Futures Yield':
                return 'Carry';
            case 'U.S. Treasuries':
                return 'T-Bonds';
            case 'Equity':
                return 'Equities';
            default:
                return assetClass;
        }
    };

    /**
     * Get exposure amount for a specific asset class (works for both ETFs and templates)
     */
    const getAssetClassAmount = (item: UnifiedItem, assetClass: string): number => {
        if (item.type === 'template') {
            // For templates, get the amount directly from the asset class exposures
            return item.exposures.get(assetClass) || 0;
        } else {
            // For ETFs, parse the exposure keys to find matching asset class
            let total = 0;
            for (const [key, amount] of item.etf!.exposures) {
                const { assetClass: ac } = parseExposureKey(key);
                if (ac === assetClass) {
                    total += amount;
                }
            }
            return total;
        }
    };

    /**
     * Calculate regional equity breakdown for an item
     */
    const getRegionalEquityBreakdown = (item: UnifiedItem): RegionalBreakdown => {
        if (item.type === 'template') {
            // For templates, calculate regional breakdown from the portfolio analysis
            let usEquityExposure = 0;
            let intlEquityExposure = 0;
            let emEquityExposure = 0;

            for (const [ticker, holding] of item.template!.holdings) {
                const etf = etfCatalog.find((e) => e.ticker === ticker);
                if (!etf) {
                    continue;
                }

                const percentage = typeof holding === 'number' ? holding : holding.percentage;
                const weight = percentToWeight(percentage);

                for (const [exposureKey, amount] of etf.exposures) {
                    const parsed = parseExposureKey(exposureKey);
                    if (parsed.assetClass === 'Equity') {
                        const weightedAmount = amount * weight;

                        if (parsed.marketRegion === 'U.S.') {
                            usEquityExposure += weightedAmount;
                        } else if (parsed.marketRegion === 'International Developed') {
                            intlEquityExposure += weightedAmount;
                        } else if (parsed.marketRegion === 'Emerging') {
                            emEquityExposure += weightedAmount;
                        }
                    }
                }
            }

            return {
                us: usEquityExposure,
                intl: intlEquityExposure,
                em: emEquityExposure,
                total: usEquityExposure + intlEquityExposure + emEquityExposure,
            };
        } else {
            // For ETFs, calculate regional equity exposure
            let usEquityExposure = 0;
            let intlEquityExposure = 0;
            let emEquityExposure = 0;

            for (const [key, amount] of item.etf!.exposures) {
                const parsed = parseExposureKey(key);
                if (parsed.assetClass === 'Equity') {
                    if (parsed.marketRegion === 'U.S.') {
                        usEquityExposure += amount;
                    } else if (parsed.marketRegion === 'International Developed') {
                        intlEquityExposure += amount;
                    } else if (parsed.marketRegion === 'Emerging') {
                        emEquityExposure += amount;
                    }
                }
            }

            return {
                us: usEquityExposure,
                intl: intlEquityExposure,
                em: emEquityExposure,
                total: usEquityExposure + intlEquityExposure + emEquityExposure,
            };
        }
    };

    /**
     * Format regional equity exposure as percentage
     */
    const formatRegionalEquity = (amount: number, total: number): string => {
        if (total === 0 || amount === 0) {
            return '-';
        }
        const percent = roundToWholePercent(calculateRelativePercent(amount, total));
        return `${percent}%`;
    };

    // Filter items based on search term, selected tab, and existing tickers
    const filteredItems = items
        .filter((item) => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const notInPortfolio =
                mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved' ? true : !existingTickers.includes(item.id);

            let matchesTab = selectedTab === 'all';
            if (!matchesTab) {
                if (mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved') {
                    if (selectedTab === 'Levered') {
                        matchesTab = item.details!.isLevered;
                    } else if (selectedTab === 'Unlevered') {
                        matchesTab = !item.details!.isLevered;
                    }
                } else {
                    matchesTab = selectedTab === 'Unlevered' ? item.leverageType === 'None' : item.leverageType === selectedTab;
                }
            }

            let matchesAssetClass = selectedAssetClassFilter === 'all';
            if (!matchesAssetClass) {
                const assetClassAmount = getAssetClassAmount(item, selectedAssetClassFilter);
                matchesAssetClass = assetClassAmount > 0;
            }

            let matchesSource = selectedSourceFilter === 'all';
            if (!matchesSource && item.source) {
                matchesSource = item.source === selectedSourceFilter;
            }

            return matchesSearch && notInPortfolio && matchesTab && matchesAssetClass && matchesSource;
        })
        .sort((a, b) => {
            try {
                // If no sort column is set, return original order
                if (!sortColumn) {
                    return 0;
                }

                if (sortColumn === 'ticker' || sortColumn === 'name') {
                    return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                } else if (sortColumn === 'leverage') {
                    const levA = a.totalLeverage;
                    const levB = b.totalLeverage;
                    return sortDirection === 'asc' ? levA - levB : levB - levA;
                } else if (sortColumn === 'type') {
                    const typeA = a.leverageType;
                    const typeB = b.leverageType;
                    return sortDirection === 'asc' ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
                } else if (sortColumn.startsWith('asset_')) {
                    const assetClass = sortColumn.replace('asset_', '');
                    const amountA = getAssetClassAmount(a, assetClass);
                    const amountB = getAssetClassAmount(b, assetClass);
                    return sortDirection === 'asc' ? amountA - amountB : amountB - amountA;
                } else if (sortColumn.startsWith('regional_')) {
                    const breakdownA = getRegionalEquityBreakdown(a);
                    const breakdownB = getRegionalEquityBreakdown(b);
                    let valueA = 0;
                    let valueB = 0;

                    if (sortColumn === 'regional_us') {
                        valueA = breakdownA.total > 0 ? breakdownA.us / breakdownA.total : 0;
                        valueB = breakdownB.total > 0 ? breakdownB.us / breakdownB.total : 0;
                    } else if (sortColumn === 'regional_intl') {
                        valueA = breakdownA.total > 0 ? breakdownA.intl / breakdownA.total : 0;
                        valueB = breakdownB.total > 0 ? breakdownB.intl / breakdownB.total : 0;
                    } else if (sortColumn === 'regional_em') {
                        valueA = breakdownA.total > 0 ? breakdownA.em / breakdownA.total : 0;
                        valueB = breakdownB.total > 0 ? breakdownB.em / breakdownB.total : 0;
                    }

                    return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
                }
                return 0;
            } catch (error) {
                console.error('Error sorting ETFs:', error, { sortColumn, a, b });
                return 0;
            }
        });

    /**
     * Handle keydown events for keyboard navigation
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
                if (filteredItems[highlightedIndex]) {
                    handleSelect(filteredItems[highlightedIndex]);
                }
                break;
            default:
                break;
        }
    };

    // Scroll to highlighted item
    useEffect(() => {
        if (listRef.current && filteredItems.length > 0) {
            const highlighted = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
            if (highlighted) {
                highlighted.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedIndex, filteredItems.length]);

    /**
     * Handle selection of an item
     */
    const handleSelect = (item: UnifiedItem): void => {
        if (mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved') {
            onSelect(item.template!);
        } else {
            onSelect(item.id);
        }

        // Clear search field if there was only one item matching the search
        if (filteredItems.length === 1) {
            setSearchTerm('');
            setHighlightedIndex(0);
        }
    };

    /**
     * Handle sorting by column
     */
    const handleSort = (column: string): void => {
        if (column === sortColumn) {
            // Three-state sorting: asc → desc → none
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortColumn('');
                setSortDirection('asc');
            }
        } else {
            setSortColumn(column);
            setSortDirection('asc'); // Default to ascending for new columns
        }
    };

    /**
     * Get badge color for leverage type
     */
    const getLeverageTypeColor = (leverageType: string): string => {
        switch (leverageType) {
            case 'Stacked':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Daily Reset':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'None':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-purple-100 text-purple-800 border-purple-200';
        }
    };

    /**
     * Get color for leverage badge based on amount
     */
    const getLeverageAmountColor = (amount: string | number): string => {
        const leverage = typeof amount === 'string' ? parseFloat(amount) : amount;

        if (mode === 'templates') {
            // Templates table: Green for ≤1.6x, Yellow for >1.6x to <2.0x, Red for ≥2.0x
            if (leverage <= 1.6) {
                return 'bg-green-100 text-green-800 border-green-200';
            } else if (leverage < 2.0) {
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            } else {
                return 'bg-red-100 text-red-800 border-red-200';
            }
        } else {
            // ETF table: Original thresholds
            if (leverage <= 1.2) {
                return 'bg-green-100 text-green-800 border-green-200';
            } else if (leverage <= 2.2) {
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            } else {
                return 'bg-red-100 text-red-800 border-red-200';
            }
        }
    };

    /**
     * Format percentage for display
     */
    const formatPercent = (value: number): string => {
        const percent = roundToWholePercent(calculateRelativePercent(value, 1));
        if (percent === 0) {
            return '-';
        }
        return `${percent}%`;
    };

    /**
     * Get asset class color
     */
    const getAssetClassColor = (assetClass: string): string => {
        switch (assetClass) {
            case 'Equity':
                return 'text-blue-700';
            case 'U.S. Treasuries':
                return 'text-green-700';
            case 'Managed Futures':
                return 'text-indigo-700';
            case 'Futures Yield':
                return 'text-purple-700';
            case 'Gold':
                return 'text-amber-700';
            case 'Bitcoin':
                return 'text-orange-700';
            default:
                return 'text-slate-700';
        }
    };

    /**
     * Get asset class background color
     */
    const getAssetClassBgColor = (assetClass: string): string => {
        switch (assetClass) {
            case 'Equity':
                return 'bg-blue-100/50 hover:bg-blue-100';
            case 'U.S. Treasuries':
                return 'bg-green-100/50 hover:bg-green-100';
            case 'Managed Futures':
                return 'bg-indigo-100/50 hover:bg-indigo-100';
            case 'Futures Yield':
                return 'bg-purple-100/50 hover:bg-purple-100';
            case 'Gold':
                return 'bg-amber-100/50 hover:bg-amber-100';
            case 'Bitcoin':
                return 'bg-orange-100/50 hover:bg-orange-100';
            default:
                return 'bg-slate-100/50 hover:bg-slate-100';
        }
    };

    // Toggle expand/collapse
    const toggleExpand = (): void => {
        setIsExpanded(!isExpanded);
    };

    // Toggle filters visibility
    const toggleFilters = (): void => {
        setShowFilters(!showFilters);
        // If the card is collapsed and filter button is pressed, expand the card
        if ((mode === 'etfs' || mode === 'templates-and-saved') && !isExpanded) {
            setIsExpanded(true);
        }
    };

    /**
     * Toggle template expansion
     */
    const toggleTemplateExpansion = (templateName: string, e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        const newExpanded = new Set(expandedTemplates);
        if (newExpanded.has(templateName)) {
            newExpanded.delete(templateName);
        } else {
            newExpanded.add(templateName);
        }
        setExpandedTemplates(newExpanded);
    };

    return (
        <Card className="border shadow-sm py-1 gap-0 overflow-hidden">
            <div className={cn('p-3 space-y-3', isExpanded ? 'border-b' : '')}>
                <div className="flex items-center">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setHighlightedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={title}
                            className="pl-9 h-8"
                        />
                    </div>
                    {(mode === 'etfs' || mode === 'templates-and-saved') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleFilters}
                            className="ml-2 h-8 w-8 p-0 cursor-pointer"
                            title="Toggle filters"
                        >
                            <FilterIcon className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={toggleExpand} className="ml-2 h-8 w-8 p-0 cursor-pointer">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            <div className={cn(isExpanded ? 'border-b' : '')}>
                {showFilters && isExpanded && (
                    <div className="space-y-0">
                        {mode === 'templates-and-saved' && (
                            <Tabs
                                defaultValue="all"
                                onValueChange={(value) => setSelectedSourceFilter(value as 'all' | 'template' | 'saved')}
                                className="w-full"
                            >
                                <div className="flex items-center w-full px-3 pt-2 pb-2">
                                    <div className="text-xs font-medium text-muted-foreground mr-2 min-w-fit">Source:</div>
                                    <TabsList className="flex-1 bg-muted/50 rounded-md h-7">
                                        <TabsTrigger value="all" className="text-xs cursor-pointer h-6">
                                            All
                                        </TabsTrigger>
                                        <TabsTrigger value="template" className="text-xs cursor-pointer h-6">
                                            Templates
                                        </TabsTrigger>
                                        <TabsTrigger value="saved" className="text-xs cursor-pointer h-6">
                                            Saved
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </Tabs>
                        )}
                        {mode === 'etfs' && (
                            <Tabs defaultValue="all" onValueChange={setSelectedTab} className="w-full">
                                <div className="flex items-center w-full px-3 pt-2">
                                    <div className="text-xs font-medium text-muted-foreground mr-2 min-w-fit">Type:</div>
                                    <TabsList className="flex-1 bg-muted/50 rounded-md h-7">
                                        <TabsTrigger value="all" className="text-xs cursor-pointer h-6">
                                            All
                                        </TabsTrigger>
                                        {leverageTypes
                                            .filter((type) => type !== 'All')
                                            .map((type) => (
                                                <TabsTrigger key={type} value={type} className="text-xs cursor-pointer h-6">
                                                    {type}
                                                </TabsTrigger>
                                            ))}
                                    </TabsList>
                                </div>
                            </Tabs>
                        )}
                        {mode === 'etfs' && (
                            <Tabs defaultValue="all" onValueChange={setSelectedAssetClassFilter} className="w-full">
                                <div className="flex items-center w-full px-3 pb-2">
                                    <div className="text-xs font-medium text-muted-foreground mr-2 min-w-fit">Asset:</div>
                                    <TabsList className="flex-1 bg-muted/50 rounded-md h-7">
                                        <TabsTrigger value="all" className="text-xs cursor-pointer h-6">
                                            All
                                        </TabsTrigger>
                                        {assetClasses.map((assetClass) => (
                                            <TabsTrigger key={assetClass} value={assetClass} className="text-xs cursor-pointer h-6">
                                                {getAssetClassDisplayName(assetClass)}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>
                            </Tabs>
                        )}
                    </div>
                )}
            </div>

            <div
                ref={listRef}
                className={cn(
                    'overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[300px] overflow-y-auto' : 'max-h-0 overflow-hidden'
                )}
            >
                {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <FilterIcon className="mx-auto h-10 w-10 opacity-20 mb-2" />
                        <p>
                            No matching{' '}
                            {mode === 'saved'
                                ? 'saved portfolios'
                                : mode === 'templates'
                                  ? 'templates'
                                  : mode === 'templates-and-saved'
                                    ? 'templates or saved portfolios'
                                    : 'ETFs'}{' '}
                            found
                        </p>
                        <p className="text-xs mt-1">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <table className="w-full border-collapse text-sm relative">
                        <thead className="bg-[#fbfbfc] text-xs sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th
                                    className="px-3 text-left font-medium cursor-pointer hover:bg-muted/40 transition-colors whitespace-nowrap"
                                    onClick={() =>
                                        handleSort(
                                            mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved' ? 'name' : 'ticker'
                                        )
                                    }
                                >
                                    <div className="flex items-center gap-1">
                                        <span>
                                            {mode === 'saved'
                                                ? 'Portfolio'
                                                : mode === 'templates'
                                                  ? 'Template'
                                                  : mode === 'templates-and-saved'
                                                    ? 'Name'
                                                    : 'Ticker'}
                                        </span>
                                        {sortColumn === 'ticker' || sortColumn === 'name' ? (
                                            sortDirection === 'asc' ? (
                                                <ArrowUp className="h-3 w-3 flex-shrink-0" />
                                            ) : (
                                                <ArrowDown className="h-3 w-3 flex-shrink-0" />
                                            )
                                        ) : (
                                            <div className="h-3 w-3 flex-shrink-0" />
                                        )}
                                    </div>
                                </th>

                                <th
                                    className="py-2 px-2 text-center font-medium cursor-pointer hover:bg-muted/40 transition-colors min-w-[60px] whitespace-nowrap"
                                    onClick={() => handleSort('leverage')}
                                >
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-1">
                                            <span>Leverage</span>
                                            {sortColumn === 'leverage' ? (
                                                sortDirection === 'asc' ? (
                                                    <ArrowUp className="h-3 w-3 flex-shrink-0" />
                                                ) : (
                                                    <ArrowDown className="h-3 w-3 flex-shrink-0" />
                                                )
                                            ) : (
                                                <div className="h-3 w-3 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                </th>

                                {assetClasses.map((assetClass) => {
                                    const isEquity = assetClass === 'Equity';
                                    return (
                                        <React.Fragment key={assetClass}>
                                            <th
                                                className={cn(
                                                    'text-center font-medium cursor-pointer hover:bg-muted/40 transition-colors min-w-[65px] whitespace-nowrap',
                                                    getAssetClassColor(assetClass)
                                                )}
                                                onClick={() => handleSort(`asset_${assetClass}`)}
                                            >
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="flex items-center gap-1">
                                                        <span>{getAssetClassDisplayName(assetClass)}</span>
                                                        {sortColumn === `asset_${assetClass}` ? (
                                                            sortDirection === 'asc' ? (
                                                                <ArrowUp className="h-3 w-3 flex-shrink-0" />
                                                            ) : (
                                                                <ArrowDown className="h-3 w-3 flex-shrink-0" />
                                                            )
                                                        ) : (
                                                            <div className="h-3 w-3 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </div>
                                            </th>

                                            {isEquity && (
                                                <>
                                                    <th
                                                        className="py-2 px-1 text-center font-medium min-w-[50px] whitespace-nowrap bg-blue-50/20 cursor-pointer hover:bg-blue-100/30 transition-colors"
                                                        onClick={() => handleSort('regional_us')}
                                                    >
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-blue-700">U.S.</span>
                                                                {sortColumn === 'regional_us' ? (
                                                                    sortDirection === 'asc' ? (
                                                                        <ArrowUp className="h-3 w-3 flex-shrink-0 text-blue-700" />
                                                                    ) : (
                                                                        <ArrowDown className="h-3 w-3 flex-shrink-0 text-blue-700" />
                                                                    )
                                                                ) : (
                                                                    <div className="h-3 w-3 flex-shrink-0" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>

                                                    <th
                                                        className="py-2 px-1 text-center font-medium min-w-[50px] whitespace-nowrap bg-blue-50/20 cursor-pointer hover:bg-blue-100/30 transition-colors"
                                                        onClick={() => handleSort('regional_intl')}
                                                    >
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-blue-700">Int&apos;l</span>
                                                                {sortColumn === 'regional_intl' ? (
                                                                    sortDirection === 'asc' ? (
                                                                        <ArrowUp className="h-3 w-3 flex-shrink-0 text-blue-700" />
                                                                    ) : (
                                                                        <ArrowDown className="h-3 w-3 flex-shrink-0 text-blue-700" />
                                                                    )
                                                                ) : (
                                                                    <div className="h-3 w-3 flex-shrink-0" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>

                                                    <th
                                                        className="py-2 px-1 text-center font-medium min-w-[45px] whitespace-nowrap bg-blue-50/20 cursor-pointer hover:bg-blue-100/30 transition-colors"
                                                        onClick={() => handleSort('regional_em')}
                                                    >
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-blue-700">EM</span>
                                                                {sortColumn === 'regional_em' ? (
                                                                    sortDirection === 'asc' ? (
                                                                        <ArrowUp className="h-3 w-3 flex-shrink-0 text-blue-700" />
                                                                    ) : (
                                                                        <ArrowDown className="h-3 w-3 flex-shrink-0 text-blue-700" />
                                                                    )
                                                                ) : (
                                                                    <div className="h-3 w-3 flex-shrink-0" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>
                                                </>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {mode !== 'templates' && mode !== 'saved' && mode !== 'templates-and-saved' && (
                                    <th
                                        className="py-2 px-2 text-center font-medium cursor-pointer hover:bg-muted/40 transition-colors min-w-[75px] whitespace-nowrap"
                                        onClick={() => handleSort('type')}
                                    >
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex items-center gap-1">
                                                <span>Type</span>
                                                {sortColumn === 'type' ? (
                                                    sortDirection === 'asc' ? (
                                                        <ArrowUp className="h-3 w-3 flex-shrink-0" />
                                                    ) : (
                                                        <ArrowDown className="h-3 w-3 flex-shrink-0" />
                                                    )
                                                ) : (
                                                    <div className="h-3 w-3 flex-shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item, index) => {
                                const isTemplateExpanded =
                                    (mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved') &&
                                    expandedTemplates.has(item.name);
                                return (
                                    <React.Fragment key={item.id}>
                                        <tr
                                            data-index={index}
                                            className={cn(
                                                'border-t border-border/30 hover:bg-accent/20 transition-colors cursor-pointer',
                                                index === highlightedIndex && 'bg-accent/30'
                                            )}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                        >
                                            <td className="py-1.5 px-3 font-medium whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    {(mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved') && (
                                                        <span
                                                            className="hover:bg-accent/50 rounded p-0.5 transition-colors"
                                                            onClick={(e) => toggleTemplateExpansion(item.name, e)}
                                                        >
                                                            {isTemplateExpanded ? (
                                                                <ChevronDown className="h-3 w-3" />
                                                            ) : (
                                                                <ChevronRight className="h-3 w-3" />
                                                            )}
                                                        </span>
                                                    )}
                                                    <span>{item.name}</span>
                                                    {mode === 'templates-and-saved' && item.source && (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'text-[10px] px-1.5 py-0 font-medium ml-1',
                                                                item.source === 'saved'
                                                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                                                    : 'bg-gray-100 text-gray-800 border-gray-200'
                                                            )}
                                                        >
                                                            {item.source === 'saved' ? 'Saved' : 'Template'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-1.5 px-2 text-center">
                                                {isEffectivelyOneX(item.totalLeverage) ? (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'text-[10px] px-1.5 py-0 font-medium',
                                                            getLeverageAmountColor(item.totalLeverage.toFixed(mode === 'templates' ? 2 : 1))
                                                        )}
                                                    >
                                                        {item.totalLeverage.toFixed(mode === 'templates' ? 2 : 1)}x
                                                    </Badge>
                                                )}
                                            </td>

                                            {((): React.ReactElement[] => {
                                                const regionalBreakdown = getRegionalEquityBreakdown(item);
                                                return assetClasses.map((assetClass) => {
                                                    const amount = getAssetClassAmount(item, assetClass);
                                                    const isEquity = assetClass === 'Equity';

                                                    return (
                                                        <React.Fragment key={assetClass}>
                                                            <td
                                                                className={cn(
                                                                    'py-1.5 px-2 text-center text-xs',
                                                                    amount > 0
                                                                        ? cn(
                                                                              'font-medium',
                                                                              getAssetClassColor(assetClass),
                                                                              getAssetClassBgColor(assetClass)
                                                                          )
                                                                        : 'text-muted-foreground',
                                                                    isEquity && 'border-l-2 border-blue-200'
                                                                )}
                                                            >
                                                                {formatPercent(amount)}
                                                            </td>

                                                            {isEquity && (
                                                                <>
                                                                    <td className="py-1.5 px-1 text-center bg-blue-50/20">
                                                                        <span className="text-xs font-medium text-blue-700">
                                                                            {formatRegionalEquity(
                                                                                regionalBreakdown.us,
                                                                                regionalBreakdown.total
                                                                            )}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-1.5 px-1 text-center bg-blue-50/20">
                                                                        <span className="text-xs font-medium text-blue-700">
                                                                            {formatRegionalEquity(
                                                                                regionalBreakdown.intl,
                                                                                regionalBreakdown.total
                                                                            )}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-1.5 px-1 text-center border-r-2 border-blue-200 bg-blue-50/20">
                                                                        <span className="text-xs font-medium text-blue-700">
                                                                            {formatRegionalEquity(
                                                                                regionalBreakdown.em,
                                                                                regionalBreakdown.total
                                                                            )}
                                                                        </span>
                                                                    </td>
                                                                </>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                });
                                            })()}

                                            {mode !== 'templates' && mode !== 'saved' && mode !== 'templates-and-saved' && (
                                                <td className="py-1.5 px-2 text-center">
                                                    {item.leverageType === 'None' ? (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'text-[10px] px-1.5 py-0 font-medium',
                                                                getLeverageTypeColor(item.leverageType)
                                                            )}
                                                        >
                                                            {item.leverageType}
                                                        </Badge>
                                                    )}
                                                </td>
                                            )}
                                        </tr>

                                        {/* Subrows for expanded templates */}
                                        {(mode === 'templates' || mode === 'saved' || mode === 'templates-and-saved') &&
                                            isTemplateExpanded &&
                                            item.template?.holdings && (
                                                <>
                                                    {Array.from(item.template.holdings.entries()).map(
                                                        ([ticker, holding], subIndex, subArray) => {
                                                            const constituentEtf = etfCatalog.find((e) => e.ticker === ticker);
                                                            const percentage = typeof holding === 'number' ? holding : holding.percentage;
                                                            const isLastSubrow = subIndex === subArray.length - 1;
                                                            return (
                                                                <tr
                                                                    key={`${item.id}-${ticker}`}
                                                                    className={cn(
                                                                        'border-t border-border/40 hover:bg-accent/60 transition-colors bg-accent/40',
                                                                        isLastSubrow && 'border-b-[3px] border-border'
                                                                    )}
                                                                >
                                                                    <td className="py-1.5 px-3 pl-10 text-xs font-medium border-l-4 border-accent">
                                                                        <div className="flex items-center gap-2">
                                                                            <span>{ticker}</span>
                                                                            <span className="text-[10px] text-muted-foreground">
                                                                                ({percentage.toFixed(0)}%)
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1.5 px-2 text-center text-xs">
                                                                        {constituentEtf &&
                                                                        !isEffectivelyOneX(
                                                                            calculateTotalExposure(
                                                                                { exposures: constituentEtf.exposures },
                                                                                true
                                                                            ) as number
                                                                        ) ? (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={cn(
                                                                                    'text-[10px] px-1.5 py-0 font-medium',
                                                                                    getLeverageAmountColor(
                                                                                        calculateTotalExposure(
                                                                                            {
                                                                                                exposures: constituentEtf.exposures,
                                                                                            },
                                                                                            true
                                                                                        ) as number
                                                                                    )
                                                                                )}
                                                                            >
                                                                                {(
                                                                                    calculateTotalExposure(
                                                                                        {
                                                                                            exposures: constituentEtf.exposures,
                                                                                        },
                                                                                        true
                                                                                    ) as number
                                                                                ).toFixed(1)}
                                                                                x
                                                                            </Badge>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">-</span>
                                                                        )}
                                                                    </td>
                                                                    {assetClasses.map((assetClass) => {
                                                                        const isEquity = assetClass === 'Equity';
                                                                        let amount = 0;

                                                                        if (constituentEtf) {
                                                                            for (const [key, amt] of constituentEtf.exposures) {
                                                                                const { assetClass: ac } = parseExposureKey(key);
                                                                                if (ac === assetClass) {
                                                                                    amount += amt;
                                                                                }
                                                                            }
                                                                        }

                                                                        const regionalBreakdown = getRegionalEquityBreakdown({
                                                                            type: 'etf',
                                                                            id: ticker,
                                                                            name: ticker,
                                                                            leverageType: 'None',
                                                                            totalLeverage: 0,
                                                                            exposures: new Map(),
                                                                            etf: constituentEtf || {
                                                                                ticker,
                                                                                exposures: new Map(),
                                                                                leverageType: 'None',
                                                                            },
                                                                        });

                                                                        return (
                                                                            <React.Fragment key={assetClass}>
                                                                                <td
                                                                                    className={cn(
                                                                                        'py-1.5 px-2 text-center text-xs',
                                                                                        amount > 0
                                                                                            ? cn(
                                                                                                  'font-medium',
                                                                                                  getAssetClassColor(assetClass),
                                                                                                  getAssetClassBgColor(assetClass)
                                                                                              )
                                                                                            : 'text-muted-foreground',
                                                                                        isEquity && 'border-l-2 border-blue-200'
                                                                                    )}
                                                                                >
                                                                                    {amount > 0 ? formatPercent(amount) : '-'}
                                                                                </td>
                                                                                {isEquity && (
                                                                                    <>
                                                                                        <td className="py-1.5 px-1 text-center bg-blue-50/20">
                                                                                            <span className="text-xs font-medium text-blue-700">
                                                                                                {formatRegionalEquity(
                                                                                                    regionalBreakdown.us,
                                                                                                    regionalBreakdown.total
                                                                                                )}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-1.5 px-1 text-center bg-blue-50/20">
                                                                                            <span className="text-xs font-medium text-blue-700">
                                                                                                {formatRegionalEquity(
                                                                                                    regionalBreakdown.intl,
                                                                                                    regionalBreakdown.total
                                                                                                )}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-1.5 px-1 text-center border-r-2 border-blue-200 bg-blue-50/20">
                                                                                            <span className="text-xs font-medium text-blue-700">
                                                                                                {formatRegionalEquity(
                                                                                                    regionalBreakdown.em,
                                                                                                    regionalBreakdown.total
                                                                                                )}
                                                                                            </span>
                                                                                        </td>
                                                                                    </>
                                                                                )}
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        }
                                                    )}
                                                </>
                                            )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </Card>
    );
};

export default TickerOrTemplateSelectionTable;
