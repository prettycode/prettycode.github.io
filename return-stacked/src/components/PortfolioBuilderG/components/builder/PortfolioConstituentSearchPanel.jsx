import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseExposureKey } from '../../utils/etfData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    SearchIcon,
    FilterIcon,
    ArrowUpDown,
    PlusCircle,
    ChevronDown,
    ChevronUp,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PortfolioConstituentSearchPanel = ({ etfCatalog, onSelect, existingTickers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTab, setSelectedTab] = useState('all');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [sortDirection, setSortDirection] = useState('asc');
    const [sortColumn, setSortColumn] = useState('ticker');
    const [isExpanded, setIsExpanded] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const listRef = useRef(null);
    const inputRef = useRef(null);

    // Get unique leverage types for tabs
    const leverageTypes = [
        'All',
        ...new Set(etfCatalog.map((etf) => (etf.leverageType === 'None' ? 'Unlevered' : etf.leverageType))),
    ];

    // Get all unique asset classes from all ETFs
    const assetClasses = useMemo(() => {
        const classes = new Set();

        etfCatalog.forEach((etf) => {
            for (const [key] of etf.exposures) {
                const { assetClass } = parseExposureKey(key);
                classes.add(assetClass);
            }
        });

        // Define preferred order of asset classes rather than alphabetical
        const preferredOrder = ['Equity', 'U.S. Treasuries', 'Managed Futures', 'Futures Yield', 'Gold', 'Bitcoin'];

        // Filter the classes that exist in our data and maintain preferred order
        const orderedClasses = preferredOrder.filter((cls) => classes.has(cls));

        // Add any classes not in our preferred order list (for future-proofing)
        Array.from(classes).forEach((cls) => {
            if (!orderedClasses.includes(cls)) {
                orderedClasses.push(cls);
            }
        });

        return orderedClasses;
    }, [etfCatalog]);

    // Auto-expand when user starts typing
    useEffect(() => {
        if (searchTerm.length > 0 && !isExpanded) {
            setIsExpanded(true);
        }
    }, [searchTerm]);

    // Get display name for asset classes (same as in AssetClassExposureBar)
    const getAssetClassDisplayName = (assetClass) => {
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

    // Calculate total exposure for an ETF
    const calculateTotalExposure = (etf, asNumber = false) => {
        let total = 0;
        for (const [_, amount] of etf.exposures) {
            total += amount;
        }
        return asNumber ? total : total.toFixed(1);
    };

    // Get exposure amount for a specific asset class in an ETF
    const getAssetClassAmount = (etf, assetClass) => {
        let total = 0;

        for (const [key, amount] of etf.exposures) {
            const { assetClass: ac } = parseExposureKey(key);
            if (ac === assetClass) {
                total += amount;
            }
        }

        return total;
    };

    // Filter ETFs based on search term, selected tab, and existing tickers
    const filteredETFs = etfCatalog
        .filter((etf) => {
            const matchesSearch = etf.ticker.toLowerCase().includes(searchTerm.toLowerCase());
            const notInPortfolio = !existingTickers.includes(etf.ticker);
            const matchesTab =
                selectedTab === 'all' ||
                (selectedTab === 'Unlevered' ? etf.leverageType === 'None' : etf.leverageType === selectedTab);

            return matchesSearch && notInPortfolio && matchesTab;
        })
        .sort((a, b) => {
            try {
                // If no sort column is set, return original order
                if (!sortColumn) return 0;

                if (sortColumn === 'ticker') {
                    return sortDirection === 'asc'
                        ? a.ticker.localeCompare(b.ticker)
                        : b.ticker.localeCompare(a.ticker);
                } else if (sortColumn === 'leverage') {
                    const levA = calculateTotalExposure(a, true);
                    const levB = calculateTotalExposure(b, true);
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
                }
                return 0;
            } catch (error) {
                console.error('Error sorting ETFs:', error, { sortColumn, a, b });
                return 0;
            }
        });

    // Handle keydown events for keyboard navigation
    const handleKeyDown = (e) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < filteredETFs.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
                if (filteredETFs[highlightedIndex]) {
                    handleSelect(filteredETFs[highlightedIndex]);
                }
                break;
            default:
                break;
        }
    };

    // Scroll to highlighted item
    useEffect(() => {
        if (listRef.current && filteredETFs.length > 0) {
            const highlighted = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
            if (highlighted) {
                highlighted.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    // Handle selection of an ETF
    const handleSelect = (etf) => {
        onSelect(etf.ticker);

        // Clear search field if there was only one ETF matching the search
        if (filteredETFs.length === 1) {
            setSearchTerm('');
            setHighlightedIndex(0);
        }
    };

    // Handle sorting by column
    const handleSort = (column) => {
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

    // Get badge color for leverage type
    const getLeverageTypeColor = (leverageType) => {
        switch (leverageType) {
            case 'Stacked':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Warning color for Stacked
            case 'Daily Reset':
                return 'bg-red-100 text-red-800 border-red-200'; // Danger color for Daily Reset
            case 'None':
                return 'bg-green-100 text-green-800 border-green-200'; // Green for Unlevered
            default:
                return 'bg-purple-100 text-purple-800 border-purple-200';
        }
    };

    // Get color for leverage badge based on amount
    const getLeverageAmountColor = (amount) => {
        const leverage = parseFloat(amount);
        if (leverage <= 1.2) {
            return 'bg-green-100 text-green-800 border-green-200'; // Safe - green
        } else if (leverage <= 2.2) {
            return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Warning - yellow
        } else {
            return 'bg-red-100 text-red-800 border-red-200'; // Danger - red
        }
    };

    // Format percentage for display
    const formatPercent = (value) => {
        const percent = Math.round(value * 100);
        if (percent === 0) return '-';
        return `${percent}%`;
    };

    // Get asset class color
    const getAssetClassColor = (assetClass) => {
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

    // Get asset class background color
    const getAssetClassBgColor = (assetClass) => {
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
    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Toggle filters visibility
    const toggleFilters = () => {
        setShowFilters(!showFilters);
        // If the card is collapsed and filter button is pressed, expand the card
        if (!isExpanded) {
            setIsExpanded(true);
        }
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
                            placeholder="Search ETFs..."
                            className="pl-9 h-8"
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFilters}
                        className="ml-2 h-8 w-8 p-0 cursor-pointer"
                        title="Toggle filters"
                    >
                        <FilterIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleExpand}
                        className="ml-2 h-8 w-8 p-0 cursor-pointer"
                    >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            <div className={cn(isExpanded ? 'border-b' : '')}>
                {showFilters && isExpanded && (
                    <Tabs defaultValue="all" onValueChange={setSelectedTab} className="w-full">
                        <div className="flex items-center w-full">
                            <TabsList className="flex-1 bg-muted/50 rounded-none">
                                <TabsTrigger value="all" className="text-xs cursor-pointer">
                                    All
                                </TabsTrigger>
                                {leverageTypes
                                    .filter((type) => type !== 'All')
                                    .map((type) => (
                                        <TabsTrigger key={type} value={type} className="text-xs cursor-pointer">
                                            {type}
                                        </TabsTrigger>
                                    ))}
                            </TabsList>
                        </div>
                    </Tabs>
                )}
            </div>

            <div
                ref={listRef}
                className={cn(
                    'overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[300px]' : 'max-h-0'
                )}
            >
                {filteredETFs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <FilterIcon className="mx-auto h-10 w-10 opacity-20 mb-2" />
                        <p>No matching ETFs found</p>
                        <p className="text-xs mt-1">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <table className="w-full border-collapse text-sm relative">
                        <thead className="bg-[#fbfbfc] text-xs sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th
                                    className="px-3 text-left font-medium cursor-pointer hover:bg-muted/40 transition-colors"
                                    onClick={() => handleSort('ticker')}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>Ticker</span>
                                        {sortColumn === 'ticker' ? (
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

                                {assetClasses.map((assetClass) => (
                                    <th
                                        key={assetClass}
                                        className={cn(
                                            'text-center font-medium cursor-pointer hover:bg-muted/40 transition-colors min-w-[60px]',
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
                                ))}

                                <th
                                    className="py-2 px-2 text-center font-medium cursor-pointer hover:bg-muted/40 transition-colors min-w-[70px]"
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

                                <th
                                    className="py-2 px-2 text-center font-medium cursor-pointer hover:bg-muted/40 transition-colors min-w-[80px]"
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
                            </tr>
                        </thead>
                        <tbody>
                            {filteredETFs.map((etf, index) => (
                                <tr
                                    key={etf.ticker}
                                    data-index={index}
                                    className={cn(
                                        'border-t border-border/30 hover:bg-accent/20 transition-colors cursor-pointer',
                                        index === highlightedIndex && 'bg-accent/30'
                                    )}
                                    onClick={() => handleSelect(etf)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    <td className="py-1.5 px-3 font-medium whitespace-nowrap">{etf.ticker}</td>

                                    {assetClasses.map((assetClass) => {
                                        const amount = getAssetClassAmount(etf, assetClass);
                                        return (
                                            <td
                                                key={assetClass}
                                                className={cn(
                                                    'py-1.5 px-2 text-center text-xs',
                                                    amount > 0
                                                        ? cn(
                                                              'font-medium',
                                                              getAssetClassColor(assetClass),
                                                              getAssetClassBgColor(assetClass)
                                                          )
                                                        : 'text-muted-foreground'
                                                )}
                                            >
                                                {formatPercent(amount)}
                                            </td>
                                        );
                                    })}

                                    <td className="py-1.5 px-2 text-center">
                                        {calculateTotalExposure(etf) === '1.0' ? (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px] px-1.5 py-0 font-medium',
                                                    getLeverageAmountColor(calculateTotalExposure(etf))
                                                )}
                                            >
                                                {calculateTotalExposure(etf)}x
                                            </Badge>
                                        )}
                                    </td>

                                    <td className="py-1.5 px-2 text-center">
                                        {etf.leverageType === 'None' ? (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px] px-1.5 py-0 font-medium',
                                                    getLeverageTypeColor(etf.leverageType)
                                                )}
                                            >
                                                {etf.leverageType}
                                            </Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Card>
    );
};

export default PortfolioConstituentSearchPanel;
