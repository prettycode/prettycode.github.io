'use client';

import React, { useState, useEffect } from 'react';
import type { Portfolio, Holding, SerializedPortfolio } from '@/types/portfolio';
import { etfCatalog, createPortfolio } from './utils/etfData';
import { examplePortfolios } from './utils/templates';
import { redistributeAfterRemoval, updateAllocation, calculateTotalAllocation } from './utils/allocationUtils';
import { migrateToPrecisionHoldings } from './utils/precisionUtils';
import { savePortfolio, getSavedPortfolios, deletePortfolio } from './utils/storageUtils';
import Builder from './components/builder/Builder';
import SaveModal from './components/builder/SaveModal';
import Analysis from './components/analysis/Analysis';

const DEFAULT_PORTFOLIO_NAME = 'New, Unsaved Portfolio';

/**
 * Allocation update for bulk operations
 */
interface AllocationUpdate {
    ticker: string;
    percentage: number;
}

/**
 * Temporary input state for controlled inputs
 */
interface TempInputs {
    [ticker: string]: number | undefined;
}

/**
 * Converts example portfolio to custom portfolio format with holding metadata
 */
const convertExampleToCustomPortfolio = (examplePortfolio: Portfolio): Portfolio => {
    const holdings = new Map<string, Holding>();

    for (const [ticker, holdingValue] of examplePortfolio.holdings) {
        const percentage = typeof holdingValue === 'number' ? holdingValue : holdingValue.percentage;
        holdings.set(ticker, {
            percentage,
            locked: false,
            disabled: false,
        });
    }

    // Ensure all holdings have basis points
    const preciseHoldings = migrateToPrecisionHoldings(holdings);

    return {
        name: examplePortfolio.name,
        holdings: preciseHoldings,
    };
};

const PortfolioManager: React.FC = () => {
    const selectedTemplate = examplePortfolios.length > 0 ? examplePortfolios[new Date().getSeconds() % examplePortfolios.length] : null;

    const defaultPortfolio = selectedTemplate
        ? convertExampleToCustomPortfolio(selectedTemplate)
        : createPortfolio(DEFAULT_PORTFOLIO_NAME, []);

    const [customPortfolio, setCustomPortfolio] = useState<Portfolio>(defaultPortfolio);
    const [originalTemplate, setOriginalTemplate] = useState<Portfolio | null>(selectedTemplate);
    const [tempInputs, setTempInputs] = useState<TempInputs>({});
    const [showDetailColumns, setShowDetailColumns] = useState<boolean>(false);
    const [savedPortfolios, setSavedPortfolios] = useState<SerializedPortfolio[]>([]);
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

    useEffect(() => {
        loadSavedPortfolios();
    }, []);

    const loadSavedPortfolios = (): void => {
        const portfolios = getSavedPortfolios();
        setSavedPortfolios(portfolios);
    };

    const updateCustomPortfolio = (updatedHoldings: Map<string, Holding>): void => {
        setCustomPortfolio({
            ...customPortfolio,
            holdings: new Map(updatedHoldings),
        });
    };

    const updatePortfolio = (portfolioData: Partial<Portfolio>, isTemplateLoad = false, templateData: Portfolio | null = null): void => {
        const fullPortfolio: Portfolio = {
            name: portfolioData.name ?? DEFAULT_PORTFOLIO_NAME,
            holdings: portfolioData.holdings ?? new Map(),
            ...portfolioData,
        };
        setCustomPortfolio(fullPortfolio);
        if (isTemplateLoad) {
            setOriginalTemplate(templateData);
        } else {
            setOriginalTemplate(null);
        }
    };

    const addETFToPortfolio = (ticker: string): void => {
        const holdings = new Map(customPortfolio.holdings);

        const initialPercentage = holdings.size === 0 ? 100 : 0;

        holdings.set(ticker, {
            percentage: initialPercentage,
            locked: false,
            disabled: false,
        });

        updateCustomPortfolio(holdings);
    };

    const removeETFFromPortfolio = (ticker: string): void => {
        if (customPortfolio.holdings.size <= 1) {
            return;
        }

        const holdings = new Map(customPortfolio.holdings);
        const updatedHoldings = redistributeAfterRemoval(holdings, ticker);

        if (updatedHoldings) {
            updateCustomPortfolio(updatedHoldings);
        }
    };

    const updateETFAllocation = (ticker: string, newPercentage: number): void => {
        const holdings = new Map(customPortfolio.holdings);
        const updatedHoldings = updateAllocation(holdings, ticker, newPercentage);

        if (updatedHoldings) {
            updateCustomPortfolio(updatedHoldings);
        }
    };

    const bulkUpdateAllocations = (allocationUpdates: AllocationUpdate[], overrideLocks = false): void => {
        const holdings = new Map(customPortfolio.holdings);

        allocationUpdates.forEach(({ ticker, percentage }) => {
            const currentHolding = holdings.get(ticker);
            if (currentHolding) {
                if (currentHolding.disabled && percentage !== 0) {
                    return;
                }

                if (currentHolding.locked && !overrideLocks) {
                    return;
                }

                holdings.set(ticker, {
                    ...currentHolding,
                    percentage,
                });
            }
        });

        // Migrate to ensure basis points are set
        const preciseHoldings = migrateToPrecisionHoldings(holdings);
        updateCustomPortfolio(preciseHoldings);
    };

    const toggleLockETF = (ticker: string): void => {
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
    };

    const toggleDisableETF = (ticker: string): void => {
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
                percentage: currentHolding.percentage,
            });

            updateCustomPortfolio(holdings);

            setTimeout(() => {
                updateETFAllocation(ticker, 0);
            }, 0);

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
            // Use redistributeAfterRemoval to handle the allocation properly with basis points
            const tempTicker = `__temp_disabled_${ticker}__`;
            holdings.set(tempTicker, {
                percentage: oldPercentage,
                locked: false,
                disabled: false,
            });
            const redistributed = redistributeAfterRemoval(holdings, tempTicker);
            updateCustomPortfolio(redistributed);
        } else {
            updateCustomPortfolio(holdings);
        }
    };

    const totalAllocation = calculateTotalAllocation(customPortfolio.holdings);

    const handleDeletePortfolio = (portfolioName: string): void => {
        try {
            const updatedPortfolios = deletePortfolio(portfolioName);

            setSavedPortfolios(updatedPortfolios);

            if (customPortfolio.name === portfolioName) {
                resetPortfolio();
            }

            alert(`Portfolio "${portfolioName}" deleted successfully.`);
        } catch (error) {
            console.error('Error deleting portfolio:', error);
            alert('There was an error deleting the portfolio. Please try again.');
        }
    };

    const resetPortfolio = (): void => {
        setCustomPortfolio(createPortfolio(DEFAULT_PORTFOLIO_NAME, []));
        setOriginalTemplate(null);
    };

    const resetToTemplate = (): void => {
        if (originalTemplate) {
            const restoredPortfolio = convertExampleToCustomPortfolio(originalTemplate);
            setCustomPortfolio(restoredPortfolio);
        }
    };

    const isTemplateModified = (): boolean => {
        if (!originalTemplate) {
            return false;
        }

        if (customPortfolio.holdings.size !== originalTemplate.holdings.size) {
            return true;
        }

        // Use basis points for exact comparison (10 basis points = 0.1%)
        for (const [ticker, templateHoldingValue] of originalTemplate.holdings.entries()) {
            const templatePercentage = typeof templateHoldingValue === 'number' ? templateHoldingValue : templateHoldingValue.percentage;
            const currentHolding = customPortfolio.holdings.get(ticker);
            if (!currentHolding) {
                return true;
            }

            // Convert to basis points for comparison
            const templateBasisPoints = Math.round(templatePercentage * 100);
            const currentBasisPoints = currentHolding.basisPoints ?? Math.round(currentHolding.percentage * 100);

            if (templateBasisPoints !== currentBasisPoints) {
                return true;
            }
        }

        return false;
    };

    const handleInputChange = (ticker: string, value: number): void => {
        setTempInputs((prev) => ({
            ...prev,
            [ticker]: value,
        }));
    };

    const handleInputBlur = (ticker: string): void => {
        if (tempInputs[ticker] !== undefined) {
            updateETFAllocation(ticker, tempInputs[ticker]);

            setTempInputs((prev) => ({
                ...prev,
                [ticker]: undefined,
            }));
        }
    };

    const openSaveModal = (): void => {
        setShowSaveModal(true);
    };

    const saveCustomPortfolio = (portfolioName: string): void => {
        try {
            const portfolioToSave: Portfolio = {
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

            alert(`Portfolio "${portfolioName}" saved successfully!`);
        } catch (error) {
            console.error('Error saving portfolio:', error);
            alert('There was an error saving your portfolio. Please try again.');
        }
    };

    const toggleDetailColumns = (): void => {
        setShowDetailColumns(!showDetailColumns);
    };

    return (
        <div className="max-w-full mx-auto p-6 bg-gray-50">
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
