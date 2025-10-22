# File Naming Convention

## Standard: PascalCase for All TypeScript/React Source Files

This project follows a **unified PascalCase convention** for all TypeScript and React source files to ensure consistency and eliminate ambiguity.

## Rules

### TypeScript/React Files

**All `.ts` and `.tsx` files use PascalCase**

Examples:

- Components: `PortfolioManager.tsx`, `Button.tsx`, `ConfirmationDialog.tsx`
- Services: `PortfolioService.ts`, `AllocationService.ts`
- Utilities: `Utils.ts`, `Logger.ts`, `Serialization.ts`
- Calculators: `AllocationCalculator.ts`, `ExposureCalculator.ts`
- Factories: `EtfFactory.ts`, `PortfolioFactory.ts`
- Catalogs: `EtfCatalog.ts`, `PortfolioTemplates.ts`
- Constants: `AssetClassColors.ts`, `PortfolioConstants.ts`
- Hooks: `UsePortfolio.ts`, `UsePersistence.ts`
- Domain Models: `Portfolio.ts`, `Exposure.ts`, `ETF.ts`
- Adapters: `LocalStorageAdapter.ts`

### Exceptions

#### Framework Requirements

- Next.js routes: `layout.tsx`, `page.tsx` (lowercase - required by Next.js)
- Barrel exports: `index.ts` (lowercase - common convention)

#### Configuration Files

- `package.json`, `tsconfig.json`, `next.config.ts`, etc. (ecosystem conventions)

#### Stylesheets

- `globals.css` (lowercase)

## Benefits

1. **Consistency**: One simple rule to follow
2. **Clarity**: File names match TypeScript conventions for types and classes
3. **Cross-platform**: Eliminates case-sensitivity issues across operating systems
4. **Maintainability**: Easy to understand and enforce

## Git Configuration

This repository is configured to handle case-sensitive filenames:

- `.gitattributes` enforces consistent line endings for source files
- `core.ignorecase = false` ensures git tracks case changes

## File Renaming

**Always use `git mv` for renaming files** to preserve git history:

```bash
# For case-only changes on case-insensitive filesystems (Windows/macOS):
git mv oldName.ts oldName_temp.ts
git mv oldName_temp.ts NewName.ts

# For other renames:
git mv old-name.ts NewName.ts
```

---

_Last Updated: October 2025_
