/**
 * AllocationService - Framework-agnostic service for portfolio allocation management
 * Handles adding, removing, and updating ETF allocations with automatic rebalancing
 */

import type { Portfolio } from '../domain/Portfolio';
import type { Holding } from '../domain/Holding';
import {
    redistributeAfterRemoval,
    updateAllocation,
    redistributeAmongAvailable,
    roundHoldingPercentages,
} from '../calculators/allocationCalculator';
import { calculateTotalAllocation, isPortfolioPrecise, ensureBasisPoints, percentToBasisPoints } from '../calculators/precision';

export class AllocationService {
    /**
     * Adds an ETF to the portfolio with specified allocation
     * Rebalances other holdings if necessary
     */
    public addHolding(portfolio: Portfolio, ticker: string, percentage: number): Portfolio {
        const newHoldings = new Map(portfolio.holdings);

        if (newHoldings.has(ticker)) {
            // ETF already exists, just update allocation
            return this.updateHoldingAllocation(portfolio, ticker, percentage);
        }

        const newHolding: Holding = {
            percentage,
            basisPoints: percentToBasisPoints(percentage),
            locked: false,
            disabled: false,
        };

        newHoldings.set(ticker, ensureBasisPoints(newHolding));

        // If portfolio is now over 100%, rebalance
        const totalAllocation = calculateTotalAllocation(newHoldings);
        if (totalAllocation > 100) {
            // Redistribute to maintain 100%
            const availableETFs = Array.from(newHoldings.keys()).filter((t) => {
                const h = newHoldings.get(t);
                return t !== ticker && h && !h.locked && !h.disabled;
            });

            if (availableETFs.length > 0) {
                redistributeAmongAvailable(newHoldings, availableETFs, 100 - percentage, true);
            }
        }

        return {
            ...portfolio,
            holdings: newHoldings,
        };
    }

    /**
     * Removes an ETF from the portfolio and redistributes its allocation
     */
    public removeHolding(portfolio: Portfolio, ticker: string): Portfolio {
        const newHoldings = new Map(portfolio.holdings);
        redistributeAfterRemoval(newHoldings, ticker);

        return {
            ...portfolio,
            holdings: newHoldings,
        };
    }

    /**
     * Updates an ETF's allocation percentage
     * Automatically rebalances other holdings to maintain 100%
     */
    public updateHoldingAllocation(portfolio: Portfolio, ticker: string, newPercentage: number): Portfolio {
        const newHoldings = new Map(portfolio.holdings);
        const result = updateAllocation(newHoldings, ticker, newPercentage);

        if (result === null) {
            // Update failed (locked, disabled, or invalid)
            return portfolio;
        }

        return {
            ...portfolio,
            holdings: result,
        };
    }

    /**
     * Locks or unlocks a holding
     * Locked holdings cannot be changed by automatic rebalancing
     */
    public setHoldingLocked(portfolio: Portfolio, ticker: string, locked: boolean): Portfolio {
        const newHoldings = new Map(portfolio.holdings);
        const holding = newHoldings.get(ticker);

        if (!holding) {
            return portfolio;
        }

        newHoldings.set(ticker, {
            ...holding,
            locked,
        });

        return {
            ...portfolio,
            holdings: newHoldings,
        };
    }

    /**
     * Enables or disables a holding
     * Disabled holdings are excluded from calculations and set to 0%
     */
    public setHoldingDisabled(portfolio: Portfolio, ticker: string, disabled: boolean): Portfolio {
        const newHoldings = new Map(portfolio.holdings);
        const holding = newHoldings.get(ticker);

        if (!holding) {
            return portfolio;
        }

        if (disabled) {
            // Disabling: redistribute this holding's allocation
            const holdingBasisPoints = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
            newHoldings.set(ticker, {
                ...holding,
                disabled: true,
            });

            const availableETFs = Array.from(newHoldings.entries())
                .filter(([t, h]) => t !== ticker && !h.locked && !h.disabled)
                .map(([t]) => t);

            if (availableETFs.length > 0 && holdingBasisPoints > 0) {
                redistributeAmongAvailable(newHoldings, availableETFs, holding.percentage, false);
            }
        } else {
            // Re-enabling: give it back its allocation
            newHoldings.set(ticker, {
                ...holding,
                disabled: false,
            });

            // Redistribute from others
            const availableETFs = Array.from(newHoldings.entries())
                .filter(([t, h]) => t !== ticker && !h.locked && !h.disabled)
                .map(([t]) => t);

            if (availableETFs.length > 0) {
                const targetPercentage = holding.percentage;
                const result = updateAllocation(newHoldings, ticker, targetPercentage);
                if (result) {
                    return {
                        ...portfolio,
                        holdings: result,
                    };
                }
            }
        }

        return {
            ...portfolio,
            holdings: newHoldings,
        };
    }

    /**
     * Redistributes allocation equally among all unlocked holdings
     */
    public equalWeight(portfolio: Portfolio): Portfolio {
        const newHoldings = new Map(portfolio.holdings);
        const unlocked = Array.from(newHoldings.entries()).filter(([, h]) => !h.locked && !h.disabled);

        if (unlocked.length === 0) {
            return portfolio;
        }

        redistributeAmongAvailable(
            newHoldings,
            unlocked.map(([t]) => t),
            100,
            true
        );

        return {
            ...portfolio,
            holdings: newHoldings,
        };
    }

    /**
     * Gets total allocation percentage
     */
    public getTotalAllocation(portfolio: Portfolio): number {
        return calculateTotalAllocation(portfolio.holdings);
    }

    /**
     * Checks if portfolio has exact 100% allocation
     */
    public isPrecise(portfolio: Portfolio): boolean {
        return isPortfolioPrecise(portfolio.holdings);
    }

    /**
     * Rounds all holding percentages (for display)
     */
    public roundPercentages(portfolio: Portfolio): Portfolio {
        const newHoldings = new Map(portfolio.holdings);
        roundHoldingPercentages(newHoldings);

        return {
            ...portfolio,
            holdings: newHoldings,
        };
    }
}
