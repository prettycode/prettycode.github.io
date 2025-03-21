import React, { useState, useRef, useEffect } from 'react';
import { parseExposureKey } from './etfData';

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
                <div key={key} className="text-xs mb-1 text-gray-600">
                    {description}: {(amount * 100).toFixed(1)}%
                </div>
            );
        }

        return constituents;
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <label className="block text-md font-medium mb-2">Add ETF to Portfolio</label>

            <div className="relative">
                <input
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
                    className="block w-full px-3 py-2 text-gray-800 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent appearance-none bg-white"
                />
                <button
                    className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        inputRef.current.focus();
                    }}
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        ></path>
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[50vh] overflow-y-auto">
                    {filteredETFs.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500">No ETFs found matching "{searchTerm}"</div>
                    ) : (
                        <ul className="py-1">
                            {filteredETFs.map((etf, index) => (
                                <li
                                    key={etf.ticker}
                                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                                        index === highlightedIndex ? 'bg-gray-100' : ''
                                    }`}
                                    onClick={() => handleSelect(etf)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    <div className="flex justify-between">
                                        <div className="font-medium">{etf.ticker}</div>
                                        <div className="text-xs text-gray-500">
                                            {etf.leverageType !== 'None' ? (
                                                <span
                                                    className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                                                        etf.leverageType === 'Stacked'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : etf.leverageType === 'Daily Reset'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-purple-100 text-purple-800'
                                                    }`}
                                                >
                                                    {etf.leverageType}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Unlevered
                                                </span>
                                            )}
                                            <span className="ml-2 px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-800">
                                                {calculateTotalExposure(etf)}x
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-1">{renderConstituents(etf)}</div>
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
