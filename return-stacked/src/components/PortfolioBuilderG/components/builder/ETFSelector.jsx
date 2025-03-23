import React, { useState, useRef, useEffect } from 'react';
import { parseExposureKey } from '../../utils/etfData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const ETFSelector = ({ etfCatalog, onSelect, existingTickers }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Filter ETFs based on search term and sort by ticker
    const filteredETFs = etfCatalog
        .filter(
            (etf) =>
                etf.ticker.toLowerCase().includes(searchTerm.toLowerCase()) && !existingTickers.includes(etf.ticker)
        )
        .sort((a, b) => a.ticker.localeCompare(b.ticker)); // Sort alphabetically by ticker

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle keydown events for keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                setHighlightedIndex((prev) => (prev < filteredETFs.length - 1 ? prev + 1 : prev));
                e.preventDefault();
                break;
            case 'ArrowUp':
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                e.preventDefault();
                break;
            case 'Enter':
                if (filteredETFs[highlightedIndex]) {
                    handleSelect(filteredETFs[highlightedIndex]);
                }
                e.preventDefault();
                break;
            case 'Escape':
                setIsOpen(false);
                e.preventDefault();
                break;
            default:
                break;
        }
    };

    // Handle selection of an ETF
    const handleSelect = (etf) => {
        onSelect(etf.ticker);
        setSearchTerm('');
        setIsOpen(false);
    };

    // Calculate total exposure for an ETF
    const calculateTotalExposure = (etf) => {
        let total = 0;
        for (const [_, amount] of etf.exposures) {
            total += amount;
        }
        return total.toFixed(1);
    };

    // Render the constituents for an ETF
    const renderConstituents = (etf) => {
        const constituents = [];

        for (const [key, amount] of etf.exposures) {
            const { assetClass, marketRegion, factorStyle, sizeFactor } = parseExposureKey(key);
            let description = assetClass;

            if (marketRegion || factorStyle || sizeFactor) {
                const details = [];
                if (sizeFactor) details.push(sizeFactor);
                if (factorStyle) details.push(factorStyle);
                if (marketRegion) details.push(marketRegion);
                description += ` (${details.join(' ')})`;
            }

            constituents.push(
                <div key={key} className="text-xs mb-1 text-muted-foreground">
                    {description}: {(amount * 100).toFixed(1)}%
                </div>
            );
        }

        return constituents;
    };

    // Helper function to get badge styling based on leverage type
    const getLeverageBadgeClass = (leverageType) => {
        switch (leverageType) {
            case 'Stacked':
                return 'bg-blue-100 text-blue-800';
            case 'Daily Reset':
                return 'bg-yellow-100 text-yellow-800';
            case 'None':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-purple-100 text-purple-800';
        }
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="relative">
                <Input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setHighlightedIndex(0);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search ETFs or select from dropdown..."
                    className="pr-10"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        inputRef.current.focus();
                    }}
                >
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-[50vh] overflow-y-auto">
                    {filteredETFs.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-muted-foreground">
                            No ETFs found matching "{searchTerm}"
                        </div>
                    ) : (
                        <ul className="py-1">
                            {filteredETFs.map((etf, index) => (
                                <li
                                    key={etf.ticker}
                                    className={cn(
                                        'px-4 py-2 cursor-pointer transition-colors',
                                        index === highlightedIndex
                                            ? 'bg-accent text-accent-foreground'
                                            : 'hover:bg-accent/50'
                                    )}
                                    onClick={() => handleSelect(etf)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="font-medium">{etf.ticker}</div>
                                        <div className="flex gap-1">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-xs font-semibold',
                                                    getLeverageBadgeClass(etf.leverageType)
                                                )}
                                            >
                                                {etf.leverageType !== 'None' ? etf.leverageType : 'Unlevered'}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="bg-red-100 text-red-800 text-xs font-semibold"
                                            >
                                                {calculateTotalExposure(etf)}x
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="mt-1 space-y-0.5">{renderConstituents(etf)}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default ETFSelector;
