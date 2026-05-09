/**
 * PortfolioService - Framework-agnostic main service that orchestrates all portfolio operations
 * This is the primary entry point for all business logic
 */

import type { Portfolio } from '../domain/Portfolio';
import type { Holding } from '../domain/Holding';
import { AllocationService } from './AllocationService';
import type { IStorageAdapter } from './IStorageAdapter';
import { deserializePortfolio } from '../utils/Serialization';

export class PortfolioService {
    private allocationService: AllocationService;
    private storageAdapter?: IStorageAdapter;

    constructor(storageAdapter?: IStorageAdapter) {
        this.allocationService = new AllocationService();
        this.storageAdapter = storageAdapter;
    }

    public createEmptyPortfolio(name: string): Portfolio {
        return {
            name,
            holdings: new Map<string, Holding>(),
            createdAt: Date.now(),
        };
    }

    public clone(portfolio: Portfolio, newName?: string): Portfolio {
        return {
            ...portfolio,
            name: newName ?? portfolio.name,
            holdings: new Map(portfolio.holdings),
            createdAt: Date.now(),
        };
    }

    public addHolding(portfolio: Portfolio, ticker: string, percentage: number): Portfolio {
        return this.allocationService.addHolding(portfolio, ticker, percentage);
    }

    public removeHolding(portfolio: Portfolio, ticker: string): Portfolio {
        return this.allocationService.removeHolding(portfolio, ticker);
    }

    public updateAllocation(portfolio: Portfolio, ticker: string, newPercentage: number): Portfolio {
        return this.allocationService.updateHoldingAllocation(portfolio, ticker, newPercentage);
    }

    public bulkUpdateAllocations(portfolio: Portfolio, updates: Array<{ ticker: string; percentage: number }>): Portfolio {
        return this.allocationService.bulkUpdateAllocations(portfolio, updates);
    }

    public lockHolding(portfolio: Portfolio, ticker: string, locked: boolean): Portfolio {
        return this.allocationService.setHoldingLocked(portfolio, ticker, locked);
    }

    public disableHolding(portfolio: Portfolio, ticker: string, disabled: boolean): Portfolio {
        return this.allocationService.setHoldingDisabled(portfolio, ticker, disabled);
    }

    public getTotalAllocation(portfolio: Portfolio): number {
        return this.allocationService.getTotalAllocation(portfolio);
    }

    public async loadAll(): Promise<Portfolio[]> {
        if (!this.storageAdapter) {
            throw new Error('Storage adapter not configured');
        }

        const serialized = await this.storageAdapter.loadPortfolios();
        return serialized.map(deserializePortfolio);
    }
}
