# Ultra-Pedantic TypeScript File Splitting Guide

## The Prompt That Generated This Structure

> I want you to go crazy with splitting up typescript files. Get really anal and pedantic. Your goal is to follow reasonable patterns while making it possible for a developer to see the types we create and use by looking at filenames alone.

## Philosophy

Split TypeScript files **so aggressively** that developers can understand your entire type system and module structure just by reading filenames in the file explorer. Every type gets its own file. Every concern gets its own file. No mixing.

## Implementation Answers

When implementing this philosophy, here are the key decisions:

### 1. **Domain Types: One File Per Type**

**Answer:** Yes. Split all 13 types/interfaces into 18+ individual files (one per type/interface).

### 2. **Service Splitting**

**Answer:** Split into multiple focused services (e.g., PortfolioManagementService, PortfolioPersistenceService, PortfolioImportExportService).

### 3. **Enums vs Type Unions**

**Answer:** There are no enums in the codebase, only TypeScript type unions (e.g., `type AssetClass = 'Equity' | 'U.S. Treasuries' | ...`). Treat them as individual type files.

### 4. **Barrel Exports (index.ts)**

**Answer:** Use modern best practices (2024-2025):

- **Avoid barrel exports** for internal modules - use explicit imports
- **Barrel exports ONLY at API boundaries** (e.g., `src/core/domain/index.ts` for external consumers)
- Why? Better tree-shaking, clearer dependencies, faster build times, no circular dependency issues

### 5. **React Hooks**

**Answer:** Keep as-is (hooks are reasonably focused).

### 6. **Constants**

**Answer:** Split. Every constant group gets its own file (e.g., `assetClassColors.ts`, `regionColors.ts`).

## Resulting Structure

```
src/core/
├── domain/ (18 files - one per type!)
│   ├── AssetClass.ts
│   ├── MarketRegion.ts
│   ├── FactorStyle.ts
│   ├── SizeFactor.ts
│   ├── LeverageType.ts
│   ├── Exposure.ts
│   ├── ExposureAmount.ts
│   ├── ETF.ts
│   ├── Holding.ts
│   ├── Portfolio.ts
│   ├── SerializedPortfolio.ts
│   ├── PortfolioAnalysis.ts
│   ├── ETFDetails.ts
│   ├── EquityBreakdown.ts
│   ├── TemplateDetails.ts
│   ├── ColorMap.ts
│   ├── Warning.ts
│   └── index.ts (barrel export for public API only)
├── calculators/
│   ├── precision/
│   │   ├── basisPointsCalculator.ts (basis points math)
│   │   ├── percentageCalculator.ts (percentage utilities)
│   │   └── index.ts
│   ├── allocationCalculator.ts
│   └── exposureCalculator.ts
└── data/
    ├── factories/
    │   ├── etfFactory.ts (createETF function)
    │   ├── portfolioFactory.ts (createPortfolio function)
    │   └── index.ts
    ├── catalogs/
    │   ├── etfCatalog.ts (ETF data + getETFByTicker)
    │   ├── portfolioTemplates.ts (example & default portfolios)
    │   └── index.ts
    └── constants/
        ├── assetClassColors.ts
        ├── regionColors.ts
        └── index.ts
```

## Key Principles

### ✅ **DO:**

1. **One type/interface per file** - If you can name it, it gets its own file
2. **Split by mathematical/logical domain** - Separate basis points math from percentage math
3. **Separate factories from data** - Factory functions live separately from data catalogs
4. **Separate constants by category** - Each constant group (colors, configs, etc.) gets its own file
5. **Use explicit imports** - Import from specific files, not barrel exports (except at public API boundaries)
6. **Name files after their primary export** - `AssetClass.ts` exports `AssetClass`, `Portfolio.ts` exports `Portfolio`
7. **Group related files in subdirectories** - `precision/`, `factories/`, `catalogs/`, `constants/`

### ❌ **DON'T:**

1. **Don't mix multiple types in one file** - Even if they're related
2. **Don't mix factories with data** - `createETF()` shouldn't live with `etfCatalog` array
3. **Don't use barrel exports internally** - They slow builds and hide dependencies
4. **Don't mix concerns in calculators** - Basis points ≠ percentage math
5. **Don't create "utils.ts" or "types.ts"** - These are code smells for lack of organization
6. **Don't mix different constant categories** - Colors, configs, etc. should be separate

## File Naming Conventions

1. **Types/Interfaces:** PascalCase matching the export
    - `AssetClass.ts` exports `type AssetClass`
    - `Portfolio.ts` exports `interface Portfolio`

2. **Functions/Utilities:** camelCase describing the module
    - `basisPointsCalculator.ts` exports basis points functions
    - `percentageCalculator.ts` exports percentage functions

3. **Data/Constants:** camelCase describing the content
    - `assetClassColors.ts` exports `assetClassColors`
    - `etfCatalog.ts` exports `etfCatalog` and `getETFByTicker()`

4. **Factories:** camelCase ending in "Factory"
    - `etfFactory.ts` exports `createETF()`
    - `portfolioFactory.ts` exports `createPortfolio()`

## Import Patterns

### ✅ **Good (Explicit Imports):**

```typescript
import type { Portfolio } from '../domain/Portfolio';
import type { Holding } from '../domain/Holding';
import { percentToBasisPoints } from '../calculators/precision/basisPointsCalculator';
```

### ❌ **Avoid (Barrel Imports for Internal Code):**

```typescript
import type { Portfolio, Holding } from '../domain'; // Too generic
import { percentToBasisPoints } from '../calculators/precision'; // Hides source
```

### ✅ **Exception (Public API Boundary):**

```typescript
// External consumers can use barrel export
import type { Portfolio, Holding, AssetClass } from '@/core/domain';
```

## Migration Process

1. **Create individual type files** - One per type/interface
2. **Update imports** - Change all imports to use new file locations
3. **Split calculators** - Separate by mathematical/logical domain
4. **Split data layer** - Separate factories, catalogs, and constants
5. **Delete old files** - Remove consolidated files
6. **Type-check** - Run `npm run tsc:ci` to verify zero errors

## Benefits

✅ **Type discoverability by filename alone**
✅ **No files mixing multiple concerns**
✅ **Clear separation of responsibilities**
✅ **Better tree-shaking in production builds**
✅ **Faster TypeScript compilation**
✅ **Easier IDE autocomplete and go-to-definition**
✅ **No circular dependency issues**
✅ **Clear patterns for future growth**

## When to Use This Approach

**Use this when:**

- You have a growing type system that needs clarity
- You want maximum discoverability for new developers
- You're building a library or framework with a public API
- You value explicit imports over convenience
- You want to prevent circular dependencies

**Don't use this when:**

- You have a tiny project with <10 types
- You're prototyping rapidly
- Build time is not a concern
- Your team prefers convenience over explicitness

## Final Result

**Before:** ~28 TypeScript files
**After:** ~60+ TypeScript files
**Increase:** 115%

Every type is now discoverable by filename alone. Your codebase is ultra-pedantically organized. 🎯
