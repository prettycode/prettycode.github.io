import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_PORTFOLIO_NAME } from './constants';
import {
    etfCatalog,
    examplePortfolios,
    redistributeAfterRemoval,
    updateAllocation,
    calculateTotalAllocation,
    savePortfolio,
    getSavedPortfolios,
    deletePortfolio,
} from './utils';
import Builder from './components/builder/Builder';
import SaveModal from './components/builder/SaveModal';
import Analysis from './components/analysis/Analysis';
import type { CustomPortfolio, Portfolio, Holding, SerializedPortfolio, AllocationUpdate } from './types';

const convertPortfolioToCustomPortfolio = (portfolio: Portfolio): CustomPortfolio => {
    const holdings = new Map<string, Holding>();

    for (const [ticker, percentage] of portfolio.holdings) {
        holdings.set(ticker, {
            percentage,
            locked: false,
            disabled: false,
        });
    }

    return {
        name: portfolio.name,
        holdings,
    };
};

const getInitialPortfolio = (): CustomPortfolio => {
    if (examplePortfolios.length === 0) {
        return {
            name: DEFAULT_PORTFOLIO_NAME,
            holdings: new Map(),
        };
    }

    const randomIndex = Math.floor(Math.random() * examplePortfolios.length);
    return convertPortfolioToCustomPortfolio(examplePortfolios[randomIndex]);
};

const PortfolioManager: React.FC = () => {
    const [customPortfolio, setCustomPortfolio] = useState<CustomPortfolio>(getInitialPortfolio);
    const [originalTemplate, setOriginalTemplate] = useState<Portfolio | null>(
        examplePortfolios.length > 0 ? examplePortfolios[Math.floor(Math.random() * examplePortfolios.length)] : null
    );
    const [tempInputs, setTempInputs] = useState<Record<string, string | undefined>>({});
    const [showDetailColumns, setShowDetailColumns] = useState(false);
    const [savedPortfolios, setSavedPortfolios] = useState<SerializedPortfolio[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        try {
            const portfolios = getSavedPortfolios();
            setSavedPortfolios(portfolios);
        } catch {
            setErrorMessage('Failed to load saved portfolios');
        }
    }, []);

    const updateCustomPortfolio = useCallback((updatedHoldings: Map<string, Holding>): void => {
        setCustomPortfolio((prev) => ({
            ...prev,
            holdings: new Map(updatedHoldings),
        }));
    }, []);

    const updatePortfolio = useCallback(
        (
            portfolioData: CustomPortfolio,
            isTemplateLoad: boolean = false,
            templateData: Portfolio | null = null
        ): void => {
            setCustomPortfolio(portfolioData);
            setOriginalTemplate(isTemplateLoad ? templateData : null);
        },
        []
    );

    const addETFToPortfolio = useCallback(
        (ticker: string): void => {
            const holdings = new Map(customPortfolio.holdings);
            const initialPercentage = holdings.size === 0 ? 100 : 0;

            holdings.set(ticker, {
                percentage: initialPercentage,
                locked: false,
                disabled: false,
            });

            updateCustomPortfolio(holdings);
        },
        [customPortfolio.holdings, updateCustomPortfolio]
    );

    const removeETFFromPortfolio = useCallback(
        (ticker: string): void => {
            if (customPortfolio.holdings.size <= 1) {
                return;
            }

            try {
                const holdings = new Map(customPortfolio.holdings);
                const updatedHoldings = redistributeAfterRemoval(holdings, ticker);
                updateCustomPortfolio(updatedHoldings);
            } catch (error) {
                setErrorMessage(`Failed to remove ETF: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        [customPortfolio.holdings, updateCustomPortfolio]
    );

    const updateETFAllocation = useCallback(
        (ticker: string, newPercentage: number): void => {
            try {
                const holdings = new Map(customPortfolio.holdings);
                const updatedHoldings = updateAllocation(holdings, ticker, newPercentage);

                if (updatedHoldings) {
                    updateCustomPortfolio(updatedHoldings);
                }
            } catch (error) {
                setErrorMessage(
                    `Failed to update allocation: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        },
        [customPortfolio.holdings, updateCustomPortfolio]
    );

    const bulkUpdateAllocations = useCallback(
        (allocationUpdates: AllocationUpdate[], overrideLocks: boolean = false): void => {
            const holdings = new Map(customPortfolio.holdings);

            for (const { ticker, percentage } of allocationUpdates) {
                const currentHolding = holdings.get(ticker);
                if (!currentHolding) {
                    continue;
                }

                if (currentHolding.disabled && percentage !== 0) {
                    continue;
                }

                if (currentHolding.locked && !overrideLocks) {
                    continue;
                }

                holdings.set(ticker, {
                    ...currentHolding,
                    percentage,
                });
            }

            for (const [ticker, holding] of holdings.entries()) {
                holdings.set(ticker, {
                    ...holding,
                    percentage: parseFloat(holding.percentage.toFixed(1)),
                });
            }

            updateCustomPortfolio(holdings);
        },
        [customPortfolio.holdings, updateCustomPortfolio]
    );

    const toggleLockETF = useCallback(
        (ticker: string): void => {
            const holdings = new Map(customPortfolio.holdings);
            const currentHolding = holdings.get(ticker);

            if (!currentHolding || currentHolding.disabled) {
                return;
            }

            holdings.set(ticker, {
                ...currentHolding,
                locked: !currentHolding.locked,
            });

            updateCustomPortfolio(holdings);
        },
        [customPortfolio.holdings, updateCustomPortfolio]
    );

    const toggleDisableETF = useCallback(
        (ticker: string): void => {
            const holdings = new Map(customPortfolio.holdings);
            const currentHolding = holdings.get(ticker);

            if (!currentHolding) {
                return;
            }

            if (currentHolding.disabled) {
                holdings.set(ticker, {
                    ...currentHolding,
                    disabled: false,
                    locked: false,
                });

                updateCustomPortfolio(holdings);
                requestAnimationFrame(() => {
                    updateETFAllocation(ticker, 0);
                });

                return;
            }

            const oldPercentage = currentHolding.percentage;

            holdings.set(ticker, {
                ...currentHolding,
                disabled: true,
                locked: false,
                percentage: 0,
            });

            const adjustableETFs = Array.from(holdings.entries())
                .filter(([etfTicker, holding]) => etfTicker !== ticker && !holding.locked && !holding.disabled)
                .map(([etfTicker]) => etfTicker);

            if (adjustableETFs.length === 0 && oldPercentage > 0) {
                return;
            }

            if (oldPercentage > 0) {
                const currentAdjustableTotal = adjustableETFs.reduce((sum, etf) => {
                    const holding = holdings.get(etf);
                    return sum + (holding?.percentage ?? 0);
                }, 0);

                if (currentAdjustableTotal <= 0) {
                    const equalShare = oldPercentage / adjustableETFs.length;

                    for (const etf of adjustableETFs) {
                        const holding = holdings.get(etf);
                        if (holding) {
                            holdings.set(etf, {
                                ...holding,
                                percentage: equalShare,
                            });
                        }
                    }
                } else {
                    for (const etf of adjustableETFs) {
                        const holding = holdings.get(etf);
                        if (holding) {
                            const proportion = holding.percentage / currentAdjustableTotal;
                            holdings.set(etf, {
                                ...holding,
                                percentage: holding.percentage + oldPercentage * proportion,
                            });
                        }
                    }
                }

                for (const [etf, holding] of holdings.entries()) {
                    holdings.set(etf, {
                        ...holding,
                        percentage: parseFloat(holding.percentage.toFixed(1)),
                    });
                }
            }

            updateCustomPortfolio(holdings);
        },
        [customPortfolio.holdings, updateCustomPortfolio, updateETFAllocation]
    );

    const totalAllocation = calculateTotalAllocation(customPortfolio.holdings);

    const resetPortfolio = useCallback((): void => {
        setCustomPortfolio({
            name: DEFAULT_PORTFOLIO_NAME,
            holdings: new Map(),
        });
        setOriginalTemplate(null);
    }, []);

    const handleDeletePortfolio = useCallback(
        (portfolioName: string): void => {
            try {
                const updatedPortfolios = deletePortfolio(portfolioName);
                setSavedPortfolios(updatedPortfolios);

                if (customPortfolio.name === portfolioName) {
                    resetPortfolio();
                }
            } catch (error) {
                setErrorMessage(
                    `Failed to delete portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        },
        [customPortfolio.name, resetPortfolio]
    );

    const resetToTemplate = useCallback((): void => {
        if (originalTemplate) {
            const restoredPortfolio = convertPortfolioToCustomPortfolio(originalTemplate);
            setCustomPortfolio(restoredPortfolio);
        }
    }, [originalTemplate]);

    const isTemplateModified = useCallback((): boolean => {
        if (!originalTemplate) {
            return false;
        }

        if (customPortfolio.holdings.size !== originalTemplate.holdings.size) {
            return true;
        }

        for (const [ticker, templatePercentage] of originalTemplate.holdings.entries()) {
            const currentHolding = customPortfolio.holdings.get(ticker);
            if (!currentHolding) {
                return true;
            }

            if (Math.abs(currentHolding.percentage - templatePercentage) > 0.1) {
                return true;
            }
        }

        return false;
    }, [customPortfolio.holdings, originalTemplate]);

    const handleInputChange = useCallback((ticker: string, value: string): void => {
        setTempInputs((prev) => ({
            ...prev,
            [ticker]: value,
        }));
    }, []);

    const handleInputBlur = useCallback(
        (ticker: string): void => {
            const value = tempInputs[ticker];
            if (value !== undefined) {
                updateETFAllocation(ticker, parseFloat(value));
                setTempInputs((prev) => ({
                    ...prev,
                    [ticker]: undefined,
                }));
            }
        },
        [tempInputs, updateETFAllocation]
    );

    const openSaveModal = useCallback((): void => {
        setShowSaveModal(true);
    }, []);

    const saveCustomPortfolio = useCallback(
        (portfolioName: string): void => {
            try {
                const portfolioToSave: CustomPortfolio = {
                    ...customPortfolio,
                    name: portfolioName,
                };

                const updatedSavedPortfolios = savePortfolio(portfolioToSave);
                setSavedPortfolios(updatedSavedPortfolios);

                setCustomPortfolio((prev) => ({
                    ...prev,
                    name: portfolioName,
                }));

                setShowSaveModal(false);
            } catch (error) {
                setErrorMessage(
                    `Failed to save portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        },
        [customPortfolio]
    );

    const toggleDetailColumns = useCallback((): void => {
        setShowDetailColumns((prev) => !prev);
    }, []);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null);
            }, 5000);
            return (): void => clearTimeout(timer);
        }
    }, [errorMessage]);

    return (
        <div className="max-w-full mx-auto p-6 bg-gray-50">
            {errorMessage && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                    {errorMessage}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-11/20 flex flex-col">
                    <div className="mb-6">
                        <Builder
                            customPortfolio={customPortfolio}
                            etfCatalog={etfCatalog}
                            tempInputs={tempInputs}
                            showDetailColumns={showDetailColumns}
                            totalAllocation={totalAllocation}
                            examplePortfolios={examplePortfolios}
                            savedPortfolios={savedPortfolios}
                            onAddETF={addETFToPortfolio}
                            onRemoveETF={removeETFFromPortfolio}
                            onUpdateAllocation={updateETFAllocation}
                            onBulkUpdateAllocations={bulkUpdateAllocations}
                            onToggleLock={toggleLockETF}
                            onToggleDisable={toggleDisableETF}
                            onInputChange={handleInputChange}
                            onInputBlur={handleInputBlur}
                            onResetPortfolio={resetPortfolio}
                            onSavePortfolio={openSaveModal}
                            onToggleDetailColumns={toggleDetailColumns}
                            onDeletePortfolio={handleDeletePortfolio}
                            onUpdatePortfolio={updatePortfolio}
                            onResetToTemplate={resetToTemplate}
                            isTemplateModified={isTemplateModified()}
                        />
                    </div>
                </div>

                <div className="md:w-9/20 flex flex-col">
                    <Analysis portfolio={customPortfolio} />
                </div>
            </div>

            <SaveModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={saveCustomPortfolio}
                initialName={customPortfolio.name !== DEFAULT_PORTFOLIO_NAME ? customPortfolio.name : ''}
            />
        </div>
    );
};

export default PortfolioManager;
