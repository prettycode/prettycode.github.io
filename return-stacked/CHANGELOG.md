# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- New ETF Info page ([src/app/etf-info/page.tsx](src/app/etf-info/page.tsx))
- Added GOVZ and SUB debug response files
- New index.ts barrel exports for etf-tax-calculator and portfolio features

### Changed
- **CSV Editor**: Major refactoring across all managers
  - Enhanced FilterManager with improved filtering logic
  - Updated ColumnManager, GroupManager, SearchManager, SelectionManager, SortManager, and TabManager
  - Core CSVEditor.js improvements (351 lines modified)
- **ETF Tax Calculator**: Simplified component structure
  - Consolidated calculator logic into single component
  - Removed separate DurationSelector, ETFCard, ResultsPanel, and TaxRateSelector components
  - Removed useETFSelection and useTaxCalculations custom hooks
  - Updated tax bracket calculations
  - Added new ETF data entries
- **Portfolio Manager**: Enhanced functionality
  - Expanded ETF catalog with additional entries (168 lines added)
  - Updated PortfolioManager and all analysis components (Analysis, AssetClassExposureBar, DetailedExposures, ExposureCard, WarningsCard)
  - Improved Builder components (Builder, CompositionPanel, HoldingsTable, TickerOrTemplateSelectionTable)
  - Enhanced ETF domain model with new properties
  - Updated EtfFactory logic
- **UI Components**: Restructured component organization
  - Moved all UI components from `src/shared/components/ui/ui/` to `src/shared/components/ui/`
  - Moved Utils from `src/shared/lib/lib/` to `src/shared/lib/`
  - Updated imports across all affected components (Badge, Button, Card, Input, Label, Progress, Separator, Slider, Switch, Table, Tabs, Toast, Tooltip)
- **API Data**: Updated bond yields data across all debug response files
  - Refreshed data for AVMU, DFNM, EDV, GOVT, MUB, SGOV, VBIL, VCRM, VGIT, VGLT, VGSH, VGUS, VTEB, VTEI, VTEL, VTES, VTG, ZROZ
  - Updated bond-yields.json with latest market data
  - Reformatted listing-status.csv (998 lines modified)
- Updated page layouts and routing configuration
- Modified fetch-bond-yields script

### Removed
- Deleted standalone ETF tax calculator component files (DurationSelector, ETFCard, ResultsPanel, TaxRateSelector)
- Removed custom hooks from etf-tax-calculator (useETFSelection, useTaxCalculations)

### Technical
- 82 files changed: 2,058 insertions(+), 1,668 deletions(-)
- Improved code organization with barrel exports
- Simplified folder structure for better maintainability
