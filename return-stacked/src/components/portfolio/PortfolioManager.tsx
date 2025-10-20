'use client';

import React, { useState, useEffect } from 'react';
import type { Portfolio, Holding, SerializedPortfolio } from '@/types/portfolio';
import { etfCatalog, createPortfolio } from './utils/etfData';
import { examplePortfolios } from './utils/templates';
import { redistributeAfterRemoval, updateAllocation, calculateTotalAllocation } from './utils/allocationUtils';
import { savePortfolio, deserializePortfolio, getSavedPortfolios } from './utils/storageUtils';
import { percentToBasisPoints, basisPointsToPercent, roundForDisplay } from './utils/precisionUtils';
import { exportPortfolio, importPortfolio } from './utils/exportImportUtils';
import Builder from './components/builder/Builder';
import SaveModal from './components/builder/SaveModal';
import Analysis from './components/analysis/Analysis';
import { useToast } from '@/components/ui/toast';

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
        const basisPoints = percentToBasisPoints(percentage);
        const precisePercentage = basisPointsToPercent(basisPoints);

        holdings.set(ticker, {
            percentage: precisePercentage,
            basisPoints: basisPoints,
            displayPercentage: roundForDisplay(precisePercentage),
            locked: false,
            disabled: false,
        });
    }

    return {
        name: examplePortfolio.name,
        holdings,
    };
};

const PortfolioManager: React.FC = () => {
    const { showToast } = useToast();
    const defaultPortfolio = createPortfolio(DEFAULT_PORTFOLIO_NAME, []);

    const [customPortfolio, setCustomPortfolio] = useState<Portfolio>(defaultPortfolio);
    const [originalTemplate, setOriginalTemplate] = useState<Portfolio | null>(null);
    const [tempInputs, setTempInputs] = useState<TempInputs>({});
    const [showDetailColumns, setShowDetailColumns] = useState<boolean>(false);
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [savedPortfolios, setSavedPortfolios] = useState<SerializedPortfolio[]>([]);

    // Load saved portfolios on mount (client-side only)
    useEffect(() => {
        setSavedPortfolios(getSavedPortfolios());
    }, []);

    // Track unsaved changes
    useEffect(() => {
        setHasUnsavedChanges(true);
    }, [customPortfolio.holdings]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            // Ctrl+S or Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const currentTotal = calculateTotalAllocation(customPortfolio.holdings);
                const isPortfolioValid = Math.abs(currentTotal - 100) < 0.01 && customPortfolio.holdings.size > 0;
                if (isPortfolioValid) {
                    openSaveModal();
                }
            }
            // Escape to close modal
            if (e.key === 'Escape' && showSaveModal) {
                setShowSaveModal(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return (): void => window.removeEventListener('keydown', handleKeyDown);
    }, [customPortfolio.holdings, showSaveModal]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
            if (hasUnsavedChanges && customPortfolio.holdings.size > 0) {
                e.preventDefault();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return (): void => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, customPortfolio.holdings.size]);

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

                const basisPoints = percentToBasisPoints(percentage);
                const precisePercentage = basisPointsToPercent(basisPoints);

                holdings.set(ticker, {
                    ...currentHolding,
                    percentage: precisePercentage,
                    basisPoints: basisPoints,
                    displayPercentage: roundForDisplay(precisePercentage),
                });
            }
        });

        updateCustomPortfolio(holdings);
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
            const templateBasisPoints = percentToBasisPoints(templatePercentage);
            const currentBasisPoints = currentHolding.basisPoints ?? percentToBasisPoints(currentHolding.percentage);

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

            savePortfolio(portfolioToSave);

            setCustomPortfolio((prev) => ({
                ...prev,
                name: portfolioName,
            }));

            setShowSaveModal(false);
            setHasUnsavedChanges(false);

            // Update saved portfolios list
            setSavedPortfolios(getSavedPortfolios());

            showToast(`Portfolio "${portfolioName}" saved successfully!`, 'success');
        } catch (error) {
            console.error('Error saving portfolio:', error);
            showToast('There was an error saving your portfolio. Please try again.', 'error');
        }
    };

    const toggleDetailColumns = (): void => {
        setShowDetailColumns(!showDetailColumns);
    };

    const handleExportPortfolio = (): void => {
        try {
            exportPortfolio(customPortfolio);
            showToast('Portfolio exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting portfolio:', error);
            showToast('Failed to export portfolio. Please try again.', 'error');
        }
    };

    const handleImportPortfolio = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const serializedPortfolio = await importPortfolio(file);
            const portfolio = deserializePortfolio(serializedPortfolio);
            setCustomPortfolio(portfolio);
            setOriginalTemplate(null);
            setHasUnsavedChanges(true);
            showToast(`Portfolio "${portfolio.name}" imported successfully!`, 'success');
        } catch (error) {
            console.error('Error importing portfolio:', error);
            showToast('Failed to import portfolio. Please check the file format.', 'error');
        }

        // Reset the input so the same file can be imported again
        event.target.value = '';
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
                            onUpdatePortfolio={updatePortfolio}
                            onResetToTemplate={resetToTemplate}
                            isTemplateModified={isTemplateModified()}
                            onExportPortfolio={handleExportPortfolio}
                            onImportPortfolio={handleImportPortfolio}
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
