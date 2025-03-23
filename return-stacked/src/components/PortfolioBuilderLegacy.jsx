'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Unlock, XCircle, Circle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ETF data with their exposures
const ETF_DATA = {
    // Original ETFs
    RSST: ['U.S. Equities:1', 'Managed Futures:1'],
    RSBT: ['Bonds:1', 'Managed Futures:1'],
    RSSY: ['U.S. Equities:1', 'Yield:1'],
    RSBY: ['Bonds:1', 'Yield:1'],
    RSSB: ['U.S. Equities:0.6', 'Ex-U.S. Equities:0.4', 'Bonds:1'],
    GDE: ['U.S. Equities:0.9', 'Gold:0.9'],
    BTGD: ['Bitcoin:1', 'Gold:1'],

    // Bond ETFs
    TMF: ['Bonds:3'],
    GOVZ: ['Bonds:1.6'],
    TLT: ['Bonds:1'],

    // Gold ETFs
    UGL: ['Gold:2'],
    GLDM: ['Gold:1'],

    // U.S. Equity ETFs
    UPRO: ['U.S. Equities:3'],
    SSO: ['U.S. Equities:2'],
    VOO: ['U.S. Equities:1'],

    // Ex-U.S. Equity ETFs
    ExUSx3: ['Ex-U.S. Equities:3'],
    ExUSx1: ['Ex-U.S. Equities:1'],
};

const EQUITY_CLASSES = ['U.S. Equities', 'Ex-U.S. Equities'];

const ASSET_CLASSES = ['Equities', 'Bonds', 'Managed Futures', 'Yield', 'Gold', 'Bitcoin'];

const COLOR_CLASSES = {
    Equities: 'bg-blue-300',
    'U.S. Equities': 'bg-blue-500',
    'Ex-U.S. Equities': 'bg-blue-700',
    Bonds: 'bg-green-500',
    'Managed Futures': 'bg-purple-500',
    Yield: 'bg-yellow-500',
    Gold: 'bg-yellow-600',
    Bitcoin: 'bg-orange-500',
};

const parseExposures = (etfStr) => {
    return etfStr.reduce((acc, exp) => {
        const [asset, value] = exp.split(':');
        acc[asset] = parseFloat(value);
        return acc;
    }, {});
};

const PortfolioBuilder = ({
    initialETFs = ['RSST'],
    initialAllocations = null,
    onExposuresChange = () => {},
    showExposures = true,
    className = '',
}) => {
    const [selectedETFs, setSelectedETFs] = useState(initialETFs);
    const [allocations, setAllocations] = useState(initialAllocations || {});
    const [exposures, setExposures] = useState({});
    const [totalLeverage, setTotalLeverage] = useState(0);
    const [lockedETFs, setLockedETFs] = useState(new Set());
    const [disabledETFs, setDisabledETFs] = useState(new Set());
    const [tempInputs, setTempInputs] = useState({});

    // Initialize first ETF at 100% if no initial allocations provided
    useEffect(() => {
        if (Object.keys(allocations).length === 0 && selectedETFs.length > 0) {
            setAllocations({ [selectedETFs[0]]: 100 });
        }
    }, []);

    // Calculate exposures and leverage
    useEffect(() => {
        const newExposures = {};

        Object.entries(allocations).forEach(([etf, allocation]) => {
            if (!selectedETFs.includes(etf) || !ETF_DATA[etf]) return;
            const etfExposures = parseExposures(ETF_DATA[etf]);
            Object.entries(etfExposures).forEach(([asset, exposure]) => {
                newExposures[asset] = (newExposures[asset] || 0) + (exposure * allocation) / 100;
            });
        });

        const totalEquities = (newExposures['U.S. Equities'] || 0) + (newExposures['Ex-U.S. Equities'] || 0);
        newExposures['Equities'] = totalEquities;

        setExposures(newExposures);

        const leverage = Object.entries(newExposures).reduce((sum, [assetClass, exposure]) => {
            if (assetClass !== 'Equities') {
                return sum + exposure;
            }
            return sum;
        }, 0);

        setTotalLeverage(leverage);

        // Notify parent component about exposure changes
        onExposuresChange(newExposures, leverage);
    }, [allocations, selectedETFs]);

    const handleAddETF = (newEtf) => {
        if (!selectedETFs.includes(newEtf)) {
            setSelectedETFs((prev) => [...prev, newEtf]);
            setAllocations((prev) => ({
                ...prev,
                [newEtf]: 0,
            }));
        }
    };

    const handleRemoveETF = (etfToRemove) => {
        if (selectedETFs.length <= 1) return;
        setSelectedETFs((prev) => prev.filter((etf) => etf !== etfToRemove));
        setLockedETFs((prev) => {
            const newLocked = new Set(prev);
            newLocked.delete(etfToRemove);
            return newLocked;
        });
    };

    const handleDeleteETF = (etfToDelete) => {
        if (selectedETFs.length <= 1) return; // Prevent deleting last ETF

        const deletedAllocation = allocations[etfToDelete] || 0;

        // Remove ETF from selected list and states
        setSelectedETFs((prev) => prev.filter((etf) => etf !== etfToDelete));

        setLockedETFs((prev) => {
            const newLocked = new Set(prev);
            newLocked.delete(etfToDelete);
            return newLocked;
        });

        setDisabledETFs((prev) => {
            const newDisabled = new Set(prev);
            newDisabled.delete(etfToDelete);
            return newDisabled;
        });

        // If deleted ETF had 0% allocation, no need to redistribute
        if (deletedAllocation === 0) {
            setAllocations((prev) => {
                const newAllocations = { ...prev };
                delete newAllocations[etfToDelete];
                return newAllocations;
            });
            return;
        }

        // Find available ETFs for redistribution
        const availableETFs = selectedETFs.filter(
            (etf) => etf !== etfToDelete && !disabledETFs.has(etf) && !lockedETFs.has(etf)
        );

        // If no available ETFs, unlock or enable one
        if (availableETFs.length === 0) {
            const remainingETFs = selectedETFs.filter((etf) => etf !== etfToDelete);
            const targetETF = remainingETFs[0];

            if (disabledETFs.has(targetETF)) {
                setDisabledETFs((prev) => {
                    const newDisabled = new Set(prev);
                    newDisabled.delete(targetETF);
                    return newDisabled;
                });
            } else if (lockedETFs.has(targetETF)) {
                setLockedETFs((prev) => {
                    const newLocked = new Set(prev);
                    newLocked.delete(targetETF);
                    return newLocked;
                });
            }

            // Redistribute to the selected ETF
            setAllocations((prev) => {
                const newAllocations = { ...prev };
                delete newAllocations[etfToDelete];
                newAllocations[targetETF] = (newAllocations[targetETF] || 0) + deletedAllocation;
                return newAllocations;
            });
            return;
        }

        // Redistribute proportionally to available ETFs
        const totalAvailableAllocation = availableETFs.reduce((sum, etf) => sum + (allocations[etf] || 0), 0);

        setAllocations((prev) => {
            const newAllocations = { ...prev };
            delete newAllocations[etfToDelete];

            if (totalAvailableAllocation <= 0) {
                // If all available ETFs have 0%, distribute equally
                const equalShare = deletedAllocation / availableETFs.length;
                availableETFs.forEach((etf) => {
                    newAllocations[etf] = (newAllocations[etf] || 0) + equalShare;
                });
            } else {
                // Distribute proportionally based on current allocations
                availableETFs.forEach((etf) => {
                    const proportion = (allocations[etf] || 0) / totalAvailableAllocation;
                    newAllocations[etf] = (newAllocations[etf] || 0) + deletedAllocation * proportion;
                });
            }

            return newAllocations;
        });
    };

    const toggleDisable = (etf) => {
        const newDisabledETFs = new Set(disabledETFs);
        const newLockedETFs = new Set(lockedETFs);

        if (newDisabledETFs.has(etf)) {
            newDisabledETFs.delete(etf);
            newLockedETFs.delete(etf);
            handleAllocationChange(etf, allocations[etf] || 0);
        } else {
            newDisabledETFs.add(etf);
            newLockedETFs.delete(etf);
            handleAllocationChange(etf, 0);
        }

        setDisabledETFs(newDisabledETFs);
        setLockedETFs(newLockedETFs);
    };

    const toggleLock = (etf) => {
        if (disabledETFs.has(etf)) return;
        const newLockedETFs = new Set(lockedETFs);
        if (newLockedETFs.has(etf)) {
            newLockedETFs.delete(etf);
        } else {
            newLockedETFs.add(etf);
        }
        setLockedETFs(newLockedETFs);
    };

    const handleAllocationChange = (changedEtf, newValue) => {
        // Don't allow changes to disabled ETFs
        if (disabledETFs.has(changedEtf)) return;
        const parsedValue = Math.max(0, Math.min(100, parseFloat(newValue) || 0));
        const oldValue = allocations[changedEtf] || 0;
        const difference = parsedValue - oldValue;

        if (difference === 0) return;

        const unlockedEtfs = selectedETFs.filter(
            (etf) => etf !== changedEtf && !lockedETFs.has(etf) && !disabledETFs.has(etf)
        );

        if (unlockedEtfs.length === 0) return;

        const newAllocations = { ...allocations };
        newAllocations[changedEtf] = parsedValue;

        // Ensure disabled ETFs stay at 0
        disabledETFs.forEach((etf) => {
            newAllocations[etf] = 0;
        });

        const lockedAllocation = Array.from(lockedETFs)
            .filter((etf) => etf !== changedEtf && !disabledETFs.has(etf))
            .reduce((sum, etf) => sum + (allocations[etf] || 0), 0);

        const remainingAllocation = 100 - lockedAllocation - parsedValue;

        if (remainingAllocation < 0) return;

        const currentUnlockedTotal = unlockedEtfs.reduce((sum, etf) => sum + (allocations[etf] || 0), 0);

        const proportions = {};
        if (currentUnlockedTotal <= 0) {
            unlockedEtfs.forEach((etf) => {
                proportions[etf] = 1 / unlockedEtfs.length;
            });
        } else {
            unlockedEtfs.forEach((etf) => {
                proportions[etf] = (allocations[etf] || 0) / currentUnlockedTotal;
            });
        }

        unlockedEtfs.forEach((etf) => {
            newAllocations[etf] = remainingAllocation * proportions[etf];
        });

        setAllocations(newAllocations);
    };

    const availableETFs = Object.keys(ETF_DATA).filter((etf) => !selectedETFs.includes(etf));

    return (
        <div className={className}>
            <div className="space-y-6">
                {selectedETFs.length < Object.keys(ETF_DATA).length && (
                    <div className="flex items-center space-x-2">
                        <Select onValueChange={handleAddETF}>
                            <SelectTrigger className="w-full min-w-64">
                                <SelectValue placeholder="Add ETF..." />
                            </SelectTrigger>
                            <SelectContent className="min-w-64">
                                {availableETFs.map((etf) => {
                                    const exposures = ETF_DATA[etf]
                                        .map((exp) => {
                                            const [asset, value] = exp.split(':');
                                            const leverage = parseFloat(value);
                                            return `${asset} ${leverage}x`;
                                        })
                                        .join(', ');
                                    return (
                                        <SelectItem key={etf} value={etf}>
                                            <span className="font-medium">{etf}</span>
                                            <span className="ml-2 text-gray-500 text-sm">({exposures})</span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-4">
                    {selectedETFs.map((etf) => (
                        <div key={etf} className="flex items-center space-x-4">
                            <div className="w-24 flex justify-between items-center">
                                <span>{etf}</span>
                                {selectedETFs.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveETF(etf)}
                                        className="p-1 h-6 w-6"
                                    >
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    </Button>
                                )}
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={allocations[etf] || 0}
                                onChange={(e) => handleAllocationChange(etf, e.target.value)}
                                className={`flex-grow ${
                                    lockedETFs.has(etf) || disabledETFs.has(etf) ? 'opacity-50' : ''
                                }`}
                                disabled={lockedETFs.has(etf) || disabledETFs.has(etf)}
                            />
                            <input
                                type="number"
                                value={
                                    tempInputs[etf] !== undefined ? tempInputs[etf] : (allocations[etf] || 0).toFixed(1)
                                }
                                onChange={(e) => {
                                    setTempInputs((prev) => ({
                                        ...prev,
                                        [etf]: e.target.value,
                                    }));
                                }}
                                onBlur={() => {
                                    if (tempInputs[etf] !== undefined) {
                                        handleAllocationChange(etf, tempInputs[etf]);
                                        setTempInputs((prev) => ({
                                            ...prev,
                                            [etf]: undefined,
                                        }));
                                    }
                                }}
                                className={`w-20 p-1 border rounded ${
                                    lockedETFs.has(etf) || disabledETFs.has(etf) ? 'bg-gray-100' : ''
                                }`}
                                disabled={lockedETFs.has(etf) || disabledETFs.has(etf)}
                            />
                            <span className="w-8">%</span>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => toggleLock(etf)}
                                    className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
                                        disabledETFs.has(etf) ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    disabled={disabledETFs.has(etf)}
                                >
                                    {lockedETFs.has(etf) ? (
                                        <Lock className="w-4 h-4 text-blue-500" />
                                    ) : (
                                        <Unlock className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                                <button
                                    onClick={() => toggleDisable(etf)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    {disabledETFs.has(etf) ? (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    ) : (
                                        <Circle className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDeleteETF(etf)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {showExposures && (
                    <>
                        <div className="space-y-2">
                            <h3 className="font-semibold">Asset Class Exposures</h3>
                            {ASSET_CLASSES.map((assetClass) => {
                                const exposure = exposures[assetClass] || 0;
                                return (
                                    <div key={assetClass} className="flex items-center space-x-2">
                                        <span className="w-32">{assetClass}</span>
                                        <div className="flex-grow bg-gray-200 h-6 rounded overflow-hidden">
                                            <div
                                                className={`h-full ${COLOR_CLASSES[assetClass]}`}
                                                style={{ width: `${Math.min(100, exposure * 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="w-20 text-right">{(exposure * 100).toFixed(1)}%</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <h3 className="font-semibold">Equities Exposure</h3>
                            {EQUITY_CLASSES.map((assetClass) => {
                                const exposure = exposures[assetClass] || 0;
                                const totalEquityExposure = exposures['Equities'] || 0;
                                const relativePercentage =
                                    totalEquityExposure === 0 ? 0 : (exposure / totalEquityExposure) * 100;
                                const displayName = assetClass === 'U.S. Equities' ? 'U.S.' : 'Ex-U.S.';
                                return (
                                    <div key={assetClass} className="flex items-center space-x-2">
                                        <span className="w-32">{displayName}</span>
                                        <div className="flex-grow bg-gray-200 h-6 rounded overflow-hidden">
                                            <div
                                                className={`h-full ${COLOR_CLASSES[assetClass]}`}
                                                style={{ width: `${Math.min(100, relativePercentage)}%` }}
                                            ></div>
                                        </div>
                                        <span className="w-20 text-right">{relativePercentage.toFixed(1)}%</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">Total Portfolio Leverage:</span>
                                <span className="text-xl font-bold">{totalLeverage.toFixed(2)}x</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export {
    PortfolioBuilder as PortfolioBuilderLegacy,
    ETF_DATA,
    ASSET_CLASSES,
    EQUITY_CLASSES,
    COLOR_CLASSES,
    parseExposures,
};
