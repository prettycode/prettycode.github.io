// Function to create a key for the exposure map
export const createExposureKey = (exposure) => {
  const marketRegion = exposure.marketRegion || '';
  const factorStyle = exposure.factorStyle || '';
  const sizeFactor = exposure.sizeFactor || '';
  
  return `${exposure.assetClass}|${marketRegion}|${factorStyle}|${sizeFactor}`;
};

// Function to create an ETF with its exposures
export const createETF = (ticker, exposureData, leverageType = 'None') => {
  const exposures = new Map();
  
  for (const { exposure, amount } of exposureData) {
    const key = createExposureKey(exposure);
    exposures.set(key, amount);
  }
  
  return { ticker, exposures, leverageType };
};

// Parse exposure key back into components
export const parseExposureKey = (key) => {
  const [assetClass, marketRegion, factorStyle, sizeFactor] = key.split('|');
  return {
    assetClass,
    marketRegion: marketRegion || undefined,
    factorStyle: factorStyle || undefined,
    sizeFactor: sizeFactor || undefined
  };
};

// Colors for asset classes and regions
export const assetClassColors = {
  'Equity': '#7070f8',
  'U.S. Treasuries': '#7070f8',
  'Managed Futures': '#7070f8',
  'Futures Yield': '#7070f8',
  'Gold': '#7070f8',
  'Bitcoin': '#7070f8'
};

export const regionColors = {
  'U.S.': '#32d296',
  'International Developed': '#32d296',
  'Emerging': '#32d296'
};

// Create the ETF catalog
export const etfCatalog = [
  createETF('RSST', [
    { exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 },
    { exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }
  ], 'Stacked'),
  
  createETF('RSBT', [
    { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
    { exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }
  ], 'Stacked'),
  
  createETF('RSSY', [
    { exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 },
    { exposure: { assetClass: 'Futures Yield' }, amount: 1.0 }
  ], 'Stacked'),
  
  createETF('RSBY', [
    { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
    { exposure: { assetClass: 'Futures Yield' }, amount: 1.0 }
  ], 'Stacked'),
  
  createETF('RSSB', [
    { exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 0.6 },
    { exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 0.3 },
    { exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 0.1 },
    { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 }
  ], 'Stacked'),
  
  createETF('TMF', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 3.0 }], 'Daily Reset'),
  createETF('GOVZ', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.6 }], 'Extended Duration'),
  createETF('TLT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 }]),
  createETF('UGL', [{ exposure: { assetClass: 'Gold' }, amount: 2.0 }], 'Daily Reset'),
  createETF('GLDM', [{ exposure: { assetClass: 'Gold' }, amount: 1.0 }]),
  
  createETF('GDE', [
    { exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 0.9 },
    { exposure: { assetClass: 'Gold' }, amount: 0.9 }
  ], 'Stacked'),
  
  createETF('BTGD', [
    { exposure: { assetClass: 'Bitcoin' }, amount: 1.0 },
    { exposure: { assetClass: 'Gold' }, amount: 1.0 }
  ], 'Stacked'),
  
  createETF('IBIT', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1.0 }]),
  createETF('UPRO', [{ exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 3.0 }], 'Daily Reset'),
  createETF('SSO', [{ exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 2.0 }], 'Daily Reset'),
  createETF('VOO', [{ exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 }]),
  createETF('QQQM', [{ exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Growth', sizeFactor: 'Large Cap' }, amount: 1.0 }]),
  createETF('VEA', [{ exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 }]),
  createETF('AVDV', [{ exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Value', sizeFactor: 'Small Cap' }, amount: 1.0 }]),
  createETF('AVEM', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 }]),
  createETF('AVEE', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Small Cap' }, amount: 1.0 }]),
  createETF('DGS', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Value', sizeFactor: 'Small Cap' }, amount: 1.0 }]),
  createETF('EDC', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 3.0 }], 'Daily Reset'),
  createETF('EET', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 2.0 }], 'Daily Reset'),
  createETF('KMLM', [{ exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }])
];

// Function to create a portfolio
export const createPortfolio = (name, description, allocations) => {
  const holdings = new Map();
  
  for (const { ticker, percentage } of allocations) {
    holdings.set(ticker, percentage);
  }
  
  return { name, description, holdings };
};

// Define example portfolios
export const examplePortfolios = [
  createPortfolio(
    "Example portfolio",
    "Optimized portfolio using high leverage across diverse asset classes to maximize returns while minimizing volatility",
    [
      { ticker: 'RSST', percentage: 17 },  // Stacked leverage: Equity + Managed Futures
      { ticker: 'RSBT', percentage: 16 },  // Stacked leverage: Treasuries + Managed Futures 
      { ticker: 'RSSY', percentage: 10 },  // Stacked leverage: Equity + Futures Yield
      { ticker: 'TMF', percentage: 12 },   // 3x Leveraged Treasuries for negative correlation to equities
      { ticker: 'UPRO', percentage: 8 },   // 3x Leveraged S&P 500
      { ticker: 'EDC', percentage: 8 },    // 3x Leveraged Emerging Markets
      { ticker: 'UGL', percentage: 8 },    // 2x Leveraged Gold for inflation protection
      { ticker: 'BTGD', percentage: 8 },   // Stacked leverage: Bitcoin + Gold for diversification
      { ticker: 'AVDV', percentage: 6 },   // International Developed Small Cap Value
      { ticker: 'DGS', percentage: 4 },    // Emerging Markets Small Cap Value
      { ticker: 'KMLM', percentage: 3 }    // Managed Futures for trend following
    ]
  )
];

// Function to analyze a portfolio's total exposure
export const analyzePortfolio = (portfolio) => {
  const exposures = new Map();
  const assetClasses = new Map();
  let totalExposure = 0;
  
  // Calculate exposures for each ETF in the portfolio
  for (const [ticker, holdingData] of portfolio.holdings) {
    // Handle both object format (for custom portfolios) and number format (for example portfolios)
    const percentage = typeof holdingData === 'object' ? holdingData.percentage : holdingData;
    const isDisabled = typeof holdingData === 'object' && holdingData.disabled;
    
    // Skip disabled holdings
    if (isDisabled) continue;
    
    const etf = etfCatalog.find(e => e.ticker === ticker);
    if (!etf) {
      console.error(`ETF with ticker ${ticker} not found in catalog`);
      continue;
    }
    
    const weight = percentage / 100; // Convert percentage to decimal
    
    for (const [key, amount] of etf.exposures) {
      const weightedAmount = amount * weight;
      const currentAmount = exposures.get(key) || 0;
      exposures.set(key, currentAmount + weightedAmount);
      
      // Also track by asset class for the chart
      const [assetClass] = key.split('|');
      const currentAssetClassAmount = assetClasses.get(assetClass) || 0;
      assetClasses.set(assetClass, currentAssetClassAmount + weightedAmount);
      
      totalExposure += weightedAmount;
    }
  }
  
  return { 
    exposures,
    assetClasses,
    totalLeverage: totalExposure,
    isLevered: totalExposure > 1
  };
}; 