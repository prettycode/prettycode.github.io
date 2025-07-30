import React, { createContext, useContext, useReducer } from 'react';
import { createPortfolio } from '../utils/etfData';
import { DEFAULT_PORTFOLIO_NAME } from '../utils';

// Initial state
const initialState = {
    portfolio: createPortfolio(DEFAULT_PORTFOLIO_NAME, []),
    showDetailColumns: false,
    tempInputs: {},
};

// Action types
export const ACTIONS = {
    UPDATE_PORTFOLIO: 'update_portfolio',
    ADD_ETF: 'add_etf',
    REMOVE_ETF: 'remove_etf',
    UPDATE_ALLOCATION: 'update_allocation',
    TOGGLE_LOCK: 'toggle_lock',
    TOGGLE_DISABLE: 'toggle_disable',
    LOAD_EXAMPLE: 'load_example',
    RESET_PORTFOLIO: 'reset_portfolio',
    SET_TEMP_INPUT: 'set_temp_input',
    CLEAR_TEMP_INPUT: 'clear_temp_input',
    TOGGLE_DETAILS: 'toggle_details',
};

// Reducer function
const portfolioReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.UPDATE_PORTFOLIO:
            return {
                ...state,
                portfolio: {
                    ...state.portfolio,
                    holdings: new Map(action.payload),
                },
            };

        case ACTIONS.ADD_ETF: {
            const ticker = action.payload;
            const holdings = new Map(state.portfolio.holdings);

            // If this is the first ETF, set it to 100%
            const initialPercentage = holdings.size === 0 ? 100 : 0;

            holdings.set(ticker, {
                percentage: initialPercentage,
                locked: false,
                disabled: false,
            });

            return {
                ...state,
                portfolio: {
                    ...state.portfolio,
                    holdings,
                },
            };
        }

        case ACTIONS.REMOVE_ETF: {
            const ticker = action.payload;
            if (state.portfolio.holdings.size <= 1) return state; // Don't remove the last ETF

            const holdings = new Map(state.portfolio.holdings);
            const holdingToRemove = holdings.get(ticker);
            const deletedAllocation = holdingToRemove ? holdingToRemove.percentage : 0;

            // Remove the ETF
            holdings.delete(ticker);

            // If deleted ETF had 0% allocation, no need to redistribute
            if (deletedAllocation === 0) {
                return {
                    ...state,
                    portfolio: {
                        ...state.portfolio,
                        holdings,
                    },
                };
            }

            // Find available ETFs for redistribution (not locked or disabled)
            const availableETFs = Array.from(holdings.entries())
                .filter(([_, holding]) => !holding.locked && !holding.disabled)
                .map(([etfTicker]) => etfTicker);

            // If no available ETFs, unlock or enable one if possible
            if (availableETFs.length === 0) {
                const remainingETFs = Array.from(holdings.keys());

                if (remainingETFs.length > 0) {
                    const targetETF = remainingETFs[0];
                    const targetHolding = holdings.get(targetETF);

                    // If disabled, enable it first
                    if (targetHolding.disabled) {
                        holdings.set(targetETF, {
                            ...targetHolding,
                            disabled: false,
                            percentage: deletedAllocation,
                        });
                    }
                    // If locked, unlock it
                    else if (targetHolding.locked) {
                        holdings.set(targetETF, {
                            ...targetHolding,
                            locked: false,
                            percentage: targetHolding.percentage + deletedAllocation,
                        });
                    }
                }
            } else {
                // Redistribute proportionally among available ETFs
                const totalAvailableAllocation = availableETFs.reduce((sum, etf) => {
                    const holding = holdings.get(etf);
                    return sum + (holding ? holding.percentage : 0);
                }, 0);

                // If all available ETFs have 0%, distribute equally
                if (totalAvailableAllocation <= 0) {
                    const equalShare = deletedAllocation / availableETFs.length;

                    for (const etf of availableETFs) {
                        const holding = holdings.get(etf);
                        holdings.set(etf, {
                            ...holding,
                            percentage: equalShare,
                        });
                    }
                }
                // Distribute proportionally based on current allocations
                else {
                    for (const etf of availableETFs) {
                        const holding = holdings.get(etf);
                        const proportion = holding.percentage / totalAvailableAllocation;

                        holdings.set(etf, {
                            ...holding,
                            percentage: holding.percentage + deletedAllocation * proportion,
                        });
                    }
                }
            }

            // Round percentages to one decimal place for cleaner UI
            for (const [etf, holding] of holdings.entries()) {
                holdings.set(etf, {
                    ...holding,
                    percentage: parseFloat(holding.percentage.toFixed(1)),
                });
            }

            return {
                ...state,
                portfolio: {
                    ...state.portfolio,
                    holdings,
                },
            };
        }

        case ACTIONS.UPDATE_ALLOCATION: {
            const { ticker, newPercentage } = action.payload;
            const holdings = new Map(state.portfolio.holdings);
            const currentHolding = holdings.get(ticker);

            // Don't allow changes to locked or disabled ETFs
            if (currentHolding.locked || currentHolding.disabled) return state;

            // Parse and constrain the new value
            const parsedValue = Math.max(0, Math.min(100, parseFloat(newPercentage) || 0));
            const oldValue = currentHolding.percentage;
            const difference = parsedValue - oldValue;

            if (difference === 0) return state;

            // Set the new allocation for this ETF
            holdings.set(ticker, {
                ...currentHolding,
                percentage: parsedValue,
            });

            // Find ETFs that can be adjusted (not locked or disabled)
            const adjustableETFs = Array.from(holdings.entries())
                .filter(([etfTicker, holding]) => etfTicker !== ticker && !holding.locked && !holding.disabled)
                .map(([etfTicker]) => etfTicker);

            // If no adjustable ETFs, revert the change
            if (adjustableETFs.length === 0) {
                return state;
            }

            // Calculate how much allocation is already locked
            const lockedAllocation = Array.from(holdings.entries())
                .filter(([etfTicker, holding]) => etfTicker !== ticker && (holding.locked || holding.disabled))
                .reduce((sum, [_, holding]) => sum + (holding.disabled ? 0 : holding.percentage), 0);

            // Calculate how much is available to distribute
            const remainingAllocation = 100 - lockedAllocation - parsedValue;

            // If remaining allocation is negative, we can't make this change
            if (remainingAllocation < 0) {
                return state;
            }

            // Calculate current total of adjustable ETFs to maintain proportions
            const currentAdjustableTotal = adjustableETFs.reduce((sum, etf) => {
                const holding = holdings.get(etf);
                return sum + holding.percentage;
            }, 0);

            // If all adjustable ETFs have 0%, distribute equally
            if (currentAdjustableTotal <= 0) {
                const equalShare = remainingAllocation / adjustableETFs.length;

                for (const etf of adjustableETFs) {
                    const holding = holdings.get(etf);
                    holdings.set(etf, {
                        ...holding,
                        percentage: equalShare,
                    });
                }
            }
            // Otherwise, distribute proportionally
            else {
                for (const etf of adjustableETFs) {
                    const holding = holdings.get(etf);
                    const proportion = holding.percentage / currentAdjustableTotal;

                    holdings.set(etf, {
                        ...holding,
                        percentage: remainingAllocation * proportion,
                    });
                }
            }

            // Round percentages to one decimal place
            for (const [etf, holding] of holdings.entries()) {
                holdings.set(etf, {
                    ...holding,
                    percentage: parseFloat(holding.percentage.toFixed(1)),
                });
            }

            return {
                ...state,
                portfolio: {
                    ...state.portfolio,
                    holdings,
                },
            };
        }

        case ACTIONS.TOGGLE_LOCK: {
            const ticker = action.payload;
            const holdings = new Map(state.portfolio.holdings);
            const currentHolding = holdings.get(ticker);

            // Can't lock a disabled ETF
            if (currentHolding.disabled) return state;

            holdings.set(ticker, {
                ...currentHolding,
                locked: !currentHolding.locked,
            });

            return {
                ...state,
                portfolio: {
                    ...state.portfolio,
                    holdings,
                },
            };
        }

        case ACTIONS.TOGGLE_DISABLE: {
            const ticker = action.payload;
            const holdings = new Map(state.portfolio.holdings);
            const currentHolding = holdings.get(ticker);

            // If we're enabling a disabled ETF
            if (currentHolding.disabled) {
                // First update the ETF to be enabled
                holdings.set(ticker, {
                    ...currentHolding,
                    disabled: false,
                    locked: false,
                    // Keep its original percentage, it will be redistributed after
                    percentage: currentHolding.percentage,
                });

                // We'll need to dispatch an update allocation action separately after this
                return {
                    ...state,
                    portfolio: {
                        ...state.portfolio,
                        holdings,
                    },
                };
            }

            // If we're disabling an ETF
            // Save current percentage
            const oldPercentage = currentHolding.percentage;

            // Update the ETF to be disabled with 0%
            holdings.set(ticker, {
                ...currentHolding,
                disabled: true,
                locked: false,
                percentage: 0,
            });

            // Find ETFs that can be adjusted
            const adjustableETFs = Array.from(holdings.entries())
                .filter(([etfTicker, holding]) => etfTicker !== ticker && !holding.locked && !holding.disabled)
                .map(([etfTicker]) => etfTicker);

            // If no adjustable ETFs, revert the change
            if (adjustableETFs.length === 0 && oldPercentage > 0) {
                return state;
            }

            // Redistribute the old percentage
            if (oldPercentage > 0) {
                // Calculate current total of adjustable ETFs
                const currentAdjustableTotal = adjustableETFs.reduce((sum, etf) => {
                    const holding = holdings.get(etf);
                    return sum + holding.percentage;
                }, 0);

                // If all adjustable ETFs have 0%, distribute equally
                if (currentAdjustableTotal <= 0) {
                    const equalShare = oldPercentage / adjustableETFs.length;

                    for (const etf of adjustableETFs) {
                        const holding = holdings.get(etf);
                        holdings.set(etf, {
                            ...holding,
                            percentage: equalShare,
                        });
                    }
                }
                // Otherwise, distribute proportionally
                else {
                    for (const etf of adjustableETFs) {
                        const holding = holdings.get(etf);
                        const proportion = holding.percentage / currentAdjustableTotal;

                        holdings.set(etf, {
                            ...holding,
                            percentage: holding.percentage + oldPercentage * proportion,
                        });
                    }
                }

                // Round percentages
                for (const [etf, holding] of holdings.entries()) {
                    holdings.set(etf, {
                        ...holding,
                        percentage: parseFloat(holding.percentage.toFixed(1)),
                    });
                }
            }

            return {
                ...state,
                portfolio: {
                    ...state.portfolio,
                    holdings,
                },
            };
        }

        case ACTIONS.TOGGLE_DETAILS:
            return {
                ...state,
                showDetailColumns: !state.showDetailColumns,
            };

        case ACTIONS.SET_TEMP_INPUT:
            return {
                ...state,
                tempInputs: {
                    ...state.tempInputs,
                    [action.payload.ticker]: action.payload.value,
                },
            };

        case ACTIONS.CLEAR_TEMP_INPUT: {
            const newTempInputs = { ...state.tempInputs };
            delete newTempInputs[action.payload];
            return {
                ...state,
                tempInputs: newTempInputs,
            };
        }

        case ACTIONS.LOAD_EXAMPLE: {
            const examplePortfolio = action.payload;
            const newHoldings = new Map();

            for (const [ticker, percentage] of examplePortfolio.holdings.entries()) {
                newHoldings.set(ticker, {
                    percentage,
                    locked: false,
                    disabled: false,
                });
            }

            return {
                ...state,
                portfolio: {
                    name: examplePortfolio.name,
                    description: examplePortfolio.description,
                    holdings: newHoldings,
                },
            };
        }

        case ACTIONS.RESET_PORTFOLIO:
            return {
                ...state,
                portfolio: createPortfolio(DEFAULT_PORTFOLIO_NAME, []),
            };

        default:
            return state;
    }
};

// Create context
const PortfolioContext = createContext();

// Context provider
export const PortfolioProvider = ({ children }) => {
    const [state, dispatch] = useReducer(portfolioReducer, initialState);

    // Calculate total allocation
    const totalAllocation = Array.from(state.portfolio.holdings.entries())
        .filter(([_, holding]) => !holding.disabled)
        .reduce((sum, [_, holding]) => sum + holding.percentage, 0);

    const contextValue = {
        state,
        dispatch,
        totalAllocation,
    };

    return <PortfolioContext.Provider value={contextValue}>{children}</PortfolioContext.Provider>;
};

// Custom hook to use the context
export const usePortfolioContext = () => {
    const context = useContext(PortfolioContext);
    if (!context) {
        throw new Error('usePortfolioContext must be used within a PortfolioProvider');
    }
    return context;
};

// Action creators
export const portfolioActions = {
    addETF: (ticker) => ({
        type: ACTIONS.ADD_ETF,
        payload: ticker,
    }),

    removeETF: (ticker) => ({
        type: ACTIONS.REMOVE_ETF,
        payload: ticker,
    }),

    updateAllocation: (ticker, newPercentage) => ({
        type: ACTIONS.UPDATE_ALLOCATION,
        payload: { ticker, newPercentage },
    }),

    toggleLock: (ticker) => ({
        type: ACTIONS.TOGGLE_LOCK,
        payload: ticker,
    }),

    toggleDisable: (ticker) => ({
        type: ACTIONS.TOGGLE_DISABLE,
        payload: ticker,
    }),

    toggleDetails: () => ({
        type: ACTIONS.TOGGLE_DETAILS,
    }),

    setTempInput: (ticker, value) => ({
        type: ACTIONS.SET_TEMP_INPUT,
        payload: { ticker, value },
    }),

    clearTempInput: (ticker) => ({
        type: ACTIONS.CLEAR_TEMP_INPUT,
        payload: ticker,
    }),

    loadExamplePortfolio: (portfolio) => ({
        type: ACTIONS.LOAD_EXAMPLE,
        payload: portfolio,
    }),

    resetPortfolio: () => ({
        type: ACTIONS.RESET_PORTFOLIO,
    }),
};
