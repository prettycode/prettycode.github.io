# Architecture Documentation

## Overview

This codebase has been modularized to separate **business logic** from **framework-specific code**. The core business logic is now completely framework-agnostic and can be used with any UI framework (React, Vue, Svelte, etc.) or in any JavaScript environment (Node.js, Deno, etc.).

## Directory Structure

```
src/
├── core/                          # Framework-agnostic business logic
│   ├── domain/                    # Domain models and types
│   │   └── types.ts              # All TypeScript type definitions
│   │
│   ├── services/                  # Business logic services
│   │   ├── PortfolioService.ts   # Main orchestrator service
│   │   ├── AllocationService.ts  # Portfolio allocation management
│   │   ├── AnalysisService.ts    # Portfolio analysis
│   │   ├── ValidationService.ts  # Portfolio validation & warnings
│   │   └── IStorageAdapter.ts    # Storage abstraction interface
│   │
│   ├── calculators/               # Pure calculation functions
│   │   ├── allocationCalculator.ts    # Allocation & rebalancing
│   │   ├── precisionCalculator.ts     # Basis points & precision
│   │   └── exposureCalculator.ts      # Exposure analysis
│   │
│   ├── data/                      # Static data
│   │   ├── etfCatalog.ts         # ETF definitions (49 ETFs)
│   │   ├── templates.ts          # Pre-configured portfolios
│   │   └── constants.ts          # Color mappings & constants
│   │
│   └── utils/                     # Pure utility functions
│       ├── exposureKeys.ts       # Exposure serialization
│       └── serialization.ts      # Portfolio serialization
│
├── adapters/                      # Framework-specific adapters
│   ├── storage/
│   │   └── LocalStorageAdapter.ts # Browser localStorage implementation
│   │
│   └── react/                     # React-specific adapters
│       └── hooks/
│           ├── usePortfolioService.ts # Service factory hook
│           ├── usePortfolio.ts        # Portfolio state management
│           └── usePersistence.ts      # Save/load operations
│
└── components/                    # UI layer (React + Tailwind)
    └── portfolio/
        ├── PortfolioManager.tsx  # Main orchestrator component
        └── components/           # Presentation components
```

## Key Principles

### 1. **Separation of Concerns**

- **Core layer**: Pure business logic, no framework dependencies
- **Adapter layer**: Framework-specific implementations
- **Component layer**: UI presentation only

### 2. **Dependency Inversion**

- Core services depend on interfaces (`IStorageAdapter`)
- Adapters implement those interfaces
- Components depend on hooks, not services directly

### 3. **Immutability**

- All service methods return new portfolio objects
- No mutation of input parameters
- React state updates are predictable

### 4. **Precision Architecture**

- Uses basis points (10000 = 100%) internally for exact math
- Avoids floating-point errors
- Guarantees portfolios always sum to exactly 100%

## Core Services

### PortfolioService

The main orchestrator that provides all portfolio operations:

```typescript
const service = new PortfolioService(storageAdapter);

// Portfolio creation
const portfolio = service.createEmptyPortfolio('My Portfolio');
const fromTemplate = service.createFromTemplate('HFEA', [...]);

// Allocation management
const updated = service.addHolding(portfolio, 'RSST', 25);
const balanced = service.updateAllocation(updated, 'RSST', 30);
const equal = service.equalWeight(portfolio);

// Analysis
const analysis = service.analyze(portfolio);
const details = service.getTemplateDetails(portfolio);
const warnings = service.validate(portfolio);

// Persistence (requires storage adapter)
await service.save(portfolio);
const all = await service.loadAll();
await service.delete('Portfolio Name');
```

### AllocationService

Manages portfolio allocations with automatic rebalancing:

- Add/remove holdings
- Update percentages
- Lock/disable holdings
- Equal weighting
- Basis points precision

### AnalysisService

Analyzes portfolio composition:

- Asset class exposures
- Leverage calculations
- Equity breakdown (US vs Ex-US)
- ETF details

### ValidationService

Validates portfolios and provides warnings:

- Single ETF concentration risk
- High daily reset leverage
- Insufficient international exposure
- Insufficient emerging markets exposure
- Insufficient small cap exposure

## React Adapters

### usePortfolioService

Creates a memoized service instance with storage adapter:

```typescript
const service = usePortfolioService();
```

### usePortfolio

Main hook for portfolio state management:

```typescript
const { portfolio, addHolding, removeHolding, updateAllocation, analysis, warnings, totalAllocation } = usePortfolio({ initialPortfolio });
```

### usePersistence

Handles saving and loading portfolios:

```typescript
const { savedPortfolios, savePortfolio, deletePortfolio, exportPortfolio, importPortfolio } = usePersistence();
```

## Storage Abstraction

The `IStorageAdapter` interface allows different storage implementations:

```typescript
interface IStorageAdapter {
    savePortfolio(portfolio: SerializedPortfolio): Promise<void>;
    loadPortfolios(): Promise<SerializedPortfolio[]>;
    deletePortfolio(name: string): Promise<void>;
    portfolioExists(name: string): Promise<boolean>;
}
```

Current implementations:

- `LocalStorageAdapter`: Browser localStorage
- Future: `SupabaseAdapter`, `FirebaseAdapter`, `IndexedDBAdapter`

## Migration Guide

### Old Pattern (Framework-Coupled)

```typescript
import { analyzePortfolio } from '@/components/portfolio/utils/etfData';
import { updateAllocation } from '@/components/portfolio/utils/allocationUtils';

const analysis = analyzePortfolio(portfolio);
const updated = updateAllocation(holdings, ticker, percentage);
```

### New Pattern (Framework-Agnostic)

```typescript
import { usePortfolio } from '@/adapters/react/hooks';

const { portfolio, updateAllocation, analysis } = usePortfolio();

// updateAllocation is now a callback that manages state
updateAllocation(ticker, percentage);
```

## Adding New Features

### Adding a New Calculator

1. Create pure function in `core/calculators/`
2. Add to appropriate service in `core/services/`
3. Expose through `PortfolioService`
4. Use in React via hooks

### Adding a New Storage Backend

1. Implement `IStorageAdapter` interface
2. Create adapter in `adapters/storage/`
3. Pass to `PortfolioService` constructor

### Adding a New UI Framework (e.g., Vue)

1. Core logic works as-is (no changes needed)
2. Create `adapters/vue/` directory
3. Create Vue composables wrapping services
4. Build Vue components using composables

## Benefits

### 1. **Testability**

- Core logic can be unit tested without React
- No need to mount components for business logic tests
- Mocks are simpler (just implement interfaces)

### 2. **Reusability**

- Same core can power CLI tools, API servers, mobile apps
- No duplication of business logic
- Consistent behavior across platforms

### 3. **Maintainability**

- Clear boundaries between layers
- Easy to locate and fix bugs
- Changes to UI don't affect business logic

### 4. **Framework Independence**

- Can migrate from React to Vue/Svelte
- Can swap Tailwind for CSS Modules
- Core logic remains unchanged

### 5. **Type Safety**

- Full TypeScript coverage
- Compile-time guarantees
- Excellent IDE autocomplete

## Examples

### Creating a CLI Tool

```typescript
import { PortfolioService } from './core/services/PortfolioService';

const service = new PortfolioService(); // No storage needed
const portfolio = service.createEmptyPortfolio('CLI Portfolio');
const updated = service.addHolding(portfolio, 'RSST', 50);
const analysis = service.analyze(updated);

console.log('Total Leverage:', analysis.totalLeverage);
```

### Building an API Endpoint

```typescript
import { PortfolioService } from './core/services/PortfolioService';
import { FirebaseAdapter } from './adapters/storage/FirebaseAdapter';

const storage = new FirebaseAdapter(firebaseConfig);
const service = new PortfolioService(storage);

app.post('/api/portfolios', async (req, res) => {
    const portfolio = service.createFromTemplate(req.body.name, req.body.allocations);
    await service.save(portfolio);
    res.json({ success: true });
});
```

### Using in Tests

```typescript
import { PortfolioService } from './core/services/PortfolioService';
import { MockStorageAdapter } from './test/mocks';

describe('PortfolioService', () => {
    it('should add holding correctly', () => {
        const service = new PortfolioService(new MockStorageAdapter());
        const portfolio = service.createEmptyPortfolio('Test');
        const result = service.addHolding(portfolio, 'RSST', 50);

        expect(result.holdings.get('RSST')?.percentage).toBe(50);
    });
});
```

## Next Steps

1. Migrate existing components to use new hooks
2. Add unit tests for core services
3. Create comprehensive integration tests
4. Consider adding more storage adapters
5. Document all public APIs with JSDoc
