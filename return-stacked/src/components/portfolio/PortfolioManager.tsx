'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Portfolio } from '@/core/domain/Portfolio';
import type { SerializedPortfolio } from '@/core/domain/SerializedPortfolio';
import { DEFAULT_PORTFOLIO_NAME, PRECISION_TOLERANCE, ALLOCATION_TOTAL_TARGET } from '@/core/data/constants';
import { etfCatalog } from '@/core/data/catalogs/EtfCatalog';
import { examplePortfolios } from '@/core/data/catalogs/PortfolioTemplates';
import { isPortfolioModified } from '@/core/utils/PortfolioComparison';
import { logger } from '@/core/utils/Logger';
import { LocalStorageAdapter } from '@/adapters/storage/LocalStorageAdapter';
import { usePortfolio } from '@/adapters/react/hooks/UsePortfolio';
import { usePersistence } from '@/adapters/react/hooks/UsePersistence';
import Builder from './components/builder/Builder';
import SaveModal from './components/builder/SaveModal';
import Analysis from './components/analysis/Analysis';
import { useToast } from '@/components/ui/Toast';
import { serializePortfolio, deserializePortfolio } from '@/core/utils/Serialization';

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
const convertExampleToCustomPortfolio = (examplePortfolio: Portfolio, service: ReturnType<typeof usePortfolio>['service']): Portfolio => {
    const holdings = new Map(examplePortfolio.holdings);
    return service.clone({ ...examplePortfolio, holdings }, examplePortfolio.name);
};

const PortfolioManager: React.FC = () => {
    const { showToast } = useToast();
    const [storageAdapter] = useState(() => new LocalStorageAdapter());

    // Use the new hooks!
    const portfolioHook = usePortfolio({
        initialPortfolio: undefined, // Will be created by the hook
    });

    const { savedPortfolios } = usePersistence();

    const [originalTemplate, setOriginalTemplate] = useState<Portfolio | null>(null);
    const [originalSavedPortfolio, setOriginalSavedPortfolio] = useState<Portfolio | null>(null);
    const [tempInputs, setTempInputs] = useState<TempInputs>({});
    const [showDetailColumns, setShowDetailColumns] = useState<boolean>(false);
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    // Track unsaved changes
    useEffect(() => {
        setHasUnsavedChanges(true);
    }, [portfolioHook.portfolio.holdings]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            // Ctrl+S or Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const currentTotal = portfolioHook.totalAllocation;
                const isPortfolioValid =
                    Math.abs(currentTotal - ALLOCATION_TOTAL_TARGET) < PRECISION_TOLERANCE && portfolioHook.portfolio.holdings.size > 0;
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
    }, [portfolioHook.totalAllocation, portfolioHook.portfolio.holdings.size, showSaveModal]);

    const updatePortfolio = (portfolioData: Partial<Portfolio>, isTemplateLoad = false, templateData: Portfolio | null = null): void => {
        const fullPortfolio: Portfolio = {
            name: portfolioData.name ?? DEFAULT_PORTFOLIO_NAME,
            holdings: portfolioData.holdings ?? new Map(),
            ...portfolioData,
        };
        portfolioHook.loadPortfolio(fullPortfolio);

        if (isTemplateLoad) {
            setOriginalTemplate(templateData);
            setOriginalSavedPortfolio(null);
            setHasUnsavedChanges(false);
        } else {
            setOriginalTemplate(null);
            setOriginalSavedPortfolio(fullPortfolio);
            setHasUnsavedChanges(false);
        }
    };

    const addETFToPortfolio = (ticker: string): void => {
        const initialPercentage = portfolioHook.portfolio.holdings.size === 0 ? ALLOCATION_TOTAL_TARGET : 0;
        portfolioHook.addHolding(ticker, initialPercentage);
    };

    const removeETFFromPortfolio = (ticker: string): void => {
        if (portfolioHook.portfolio.holdings.size <= 1) {
            return;
        }

        portfolioHook.removeHolding(ticker);
    };

    const updateETFAllocation = (ticker: string, newPercentage: number): void => {
        portfolioHook.updateAllocation(ticker, newPercentage);
    };

    const bulkUpdateAllocations = (allocationUpdates: AllocationUpdate[], overrideLocks = false): void => {
        const currentHoldings = new Map(portfolioHook.portfolio.holdings);

        // Filter updates to only include valid ones
        const validUpdates = allocationUpdates.filter(({ ticker, percentage }) => {
            const currentHolding = currentHoldings.get(ticker);
            if (!currentHolding) {
                return false;
            }

            if (currentHolding.disabled && percentage !== 0) {
                return false;
            }

            if (currentHolding.locked && !overrideLocks) {
                return false;
            }

            return true;
        });

        // Apply all updates at once without triggering individual rebalances
        if (validUpdates.length > 0) {
            portfolioHook.bulkUpdateAllocations(validUpdates);
        }
    };

    const toggleLockETF = (ticker: string): void => {
        const currentHolding = portfolioHook.portfolio.holdings.get(ticker);
        if (!currentHolding || currentHolding.disabled) {
            return;
        }
        portfolioHook.lockHolding(ticker, !currentHolding.locked);
    };

    const toggleDisableETF = (ticker: string): void => {
        const currentHolding = portfolioHook.portfolio.holdings.get(ticker);
        if (!currentHolding) {
            return;
        }

        portfolioHook.disableHolding(ticker, !currentHolding.disabled);
    };

    const totalAllocation = portfolioHook.totalAllocation;

    const resetPortfolio = (): void => {
        portfolioHook.resetPortfolio(DEFAULT_PORTFOLIO_NAME);
        setOriginalTemplate(null);
        setOriginalSavedPortfolio(null);
        setHasUnsavedChanges(false);
    };

    const resetToTemplate = (): void => {
        if (originalTemplate) {
            const restoredPortfolio = convertExampleToCustomPortfolio(originalTemplate, portfolioHook.service);
            portfolioHook.loadPortfolio(restoredPortfolio);
            setHasUnsavedChanges(false);
        }
    };

    const isTemplateModified = useCallback((): boolean => {
        if (!originalTemplate) {
            return false;
        }
        return isPortfolioModified(portfolioHook.portfolio, originalTemplate);
    }, [originalTemplate, portfolioHook.portfolio]);

    const isSavedPortfolioModified = useCallback((): boolean => {
        if (!originalSavedPortfolio) {
            return false;
        }

        // Check if name changed
        if (portfolioHook.portfolio.name !== originalSavedPortfolio.name) {
            return true;
        }

        return isPortfolioModified(portfolioHook.portfolio, originalSavedPortfolio);
    }, [originalSavedPortfolio, portfolioHook.portfolio]);

    const hasActualUnsavedChanges = useCallback((): boolean => {
        // No holdings means nothing to save
        if (portfolioHook.portfolio.holdings.size === 0) {
            return false;
        }

        // If it's an unmodified template, no unsaved changes
        if (originalTemplate && !isTemplateModified()) {
            return false;
        }

        // If it's an unmodified saved portfolio, no unsaved changes
        if (originalSavedPortfolio && !isSavedPortfolioModified()) {
            return false;
        }

        // Otherwise, if hasUnsavedChanges is true, there are actual unsaved changes
        return hasUnsavedChanges;
    }, [
        portfolioHook.portfolio.holdings.size,
        originalTemplate,
        isTemplateModified,
        originalSavedPortfolio,
        isSavedPortfolioModified,
        hasUnsavedChanges,
    ]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
            if (hasActualUnsavedChanges()) {
                e.preventDefault();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return (): void => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasActualUnsavedChanges]);

    const handleInputChange = (ticker: string, value: number): void => {
        setTempInputs((prev) => ({
            ...prev,
            [ticker]: value,
        }));
    };

    const handleInputBlur = (ticker: string): void => {
        const value = tempInputs[ticker];
        if (value !== undefined) {
            updateETFAllocation(ticker, value);

            setTempInputs((prev) => ({
                ...prev,
                [ticker]: undefined,
            }));
        }
    };

    const openSaveModal = (): void => {
        setShowSaveModal(true);
    };

    const saveCustomPortfolio = async (portfolioName: string): Promise<void> => {
        try {
            const portfolioToSave: Portfolio = {
                ...portfolioHook.portfolio,
                name: portfolioName,
            };

            const serialized = serializePortfolio(portfolioToSave);
            await storageAdapter.savePortfolio(serialized);

            portfolioHook.setPortfolio((prev) => ({
                ...prev,
                name: portfolioName,
            }));

            setShowSaveModal(false);
            setHasUnsavedChanges(false);

            showToast(`Portfolio "${portfolioName}" saved successfully!`, 'success');
        } catch (error) {
            logger.error('Error saving portfolio', error);
            showToast('There was an error saving your portfolio. Please try again.', 'error');
        }
    };

    const toggleDetailColumns = (): void => {
        setShowDetailColumns(!showDetailColumns);
    };

    const handleExportPortfolio = (): void => {
        try {
            const serialized = serializePortfolio(portfolioHook.portfolio);
            const dataStr = JSON.stringify(serialized, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${portfolioHook.portfolio.name || 'portfolio'}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Portfolio exported successfully!', 'success');
        } catch (error) {
            logger.error('Error exporting portfolio', error);
            showToast('Failed to export portfolio. Please try again.', 'error');
        }
    };

    const handleImportPortfolio = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const serializedPortfolio = JSON.parse(text) as SerializedPortfolio;
            const portfolio = deserializePortfolio(serializedPortfolio);
            portfolioHook.loadPortfolio(portfolio);
            setOriginalTemplate(null);
            setHasUnsavedChanges(true);
            showToast(`Portfolio "${portfolio.name}" imported successfully!`, 'success');
        } catch (error) {
            logger.error('Error importing portfolio', error);
            showToast('Failed to import portfolio. Please check the file format.', 'error');
        }

        // Reset the input so the same file can be imported again
        event.target.value = '';
    };

    // Convert serialized portfolios for display
    const serializedSavedPortfolios: SerializedPortfolio[] = savedPortfolios.map(serializePortfolio);

    return (
        <div className="max-w-full mx-auto p-6 bg-gray-50">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-11/20 flex flex-col">
                    <div className="mb-6">
                        <Builder
                            customPortfolio={portfolioHook.portfolio}
                            etfCatalog={etfCatalog}
                            tempInputs={tempInputs}
                            showDetailColumns={showDetailColumns}
                            totalAllocation={totalAllocation}
                            examplePortfolios={examplePortfolios}
                            savedPortfolios={serializedSavedPortfolios}
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
                    <Analysis portfolio={portfolioHook.portfolio} />
                </div>
            </div>

            <SaveModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={saveCustomPortfolio}
                initialName={portfolioHook.portfolio.name !== DEFAULT_PORTFOLIO_NAME ? portfolioHook.portfolio.name : ''}
            />
        </div>
    );
};

export default PortfolioManager;
