import React, { useState } from 'react';

// Function to create a key for the exposure map
const createExposureKey = (exposure) => {
  const marketRegion = exposure.marketRegion || '';
  const factorStyle = exposure.factorStyle || '';
  const sizeFactor = exposure.sizeFactor || '';
  
  return `${exposure.assetClass}|${marketRegion}|${factorStyle}|${sizeFactor}`;
};

// Function to create an ETF with its exposures
const createETF = (ticker, exposureData) => {
  const exposures = new Map();
  
  for (const { exposure, amount } of exposureData) {
    const key = createExposureKey(exposure);
    exposures.set(key, amount);
  }
  
  return { ticker, exposures };
};

// Create the ETF catalog
const etfCatalog = [
  createETF('RSST', [
    { exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 },
    { exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }
  ]),
  createETF('RSBT', [
    { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
    { exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }
  ]),
  createETF('RSSY', [
    { exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 },
    { exposure: { assetClass: 'Futures Yield' }, amount: 1.0 }
  ]),
  createETF('RSBY', [
    { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
    { exposure: { assetClass: 'Futures Yield' }, amount: 1.0 }
  ]),
  createETF('RSSB', [
    { exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 0.6 },
    { exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 0.3 },
    { exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 0.1 },
    { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 }
  ]),
  createETF('TMF', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 3.0 }]),
  createETF('GOVZ', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.6 }]),
  createETF('TLT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 }]),
  createETF('UGL', [{ exposure: { assetClass: 'Gold' }, amount: 2.0 }]),
  createETF('GLDM', [{ exposure: { assetClass: 'Gold' }, amount: 1.0 }]),
  createETF('GDE', [
    { exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 0.9 },
    { exposure: { assetClass: 'Gold' }, amount: 0.9 }
  ]),
  createETF('BTGD', [
    { exposure: { assetClass: 'Bitcoin' }, amount: 1.0 },
    { exposure: { assetClass: 'Gold' }, amount: 1.0 }
  ]),
  createETF('IBIT', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1.0 }]),
  createETF('UPRO', [{ exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 3.0 }]),
  createETF('SSO', [{ exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 2.0 }]),
  createETF('VOO', [{ exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 }]),
  createETF('QQQM', [{ exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Growth', sizeFactor: 'Large Cap' }, amount: 1.0 }]),
  createETF('VEA', [{ exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 }]),
  createETF('AVDV', [{ exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Value', sizeFactor: 'Small Cap' }, amount: 1.0 }]),
  createETF('AVEM', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 1.0 }]),
  createETF('AVEE', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Small Cap' }, amount: 1.0 }]),
  createETF('DGS', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Value', sizeFactor: 'Small Cap' }, amount: 1.0 }]),
  createETF('EDC', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 3.0 }]),
  createETF('EET', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' }, amount: 2.0 }]),
  createETF('KMLM', [{ exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }])
];

// Function to create a portfolio
const createPortfolio = (name, description, allocations) => {
  const holdings = new Map();
  
  for (const { ticker, percentage } of allocations) {
    holdings.set(ticker, percentage);
  }
  
  return { name, description, holdings };
};

// Define example portfolios
const examplePortfolios = [
  createPortfolio(
    "Balanced Portfolio",
    "Equal allocation to stocks, bonds, and gold",
    [
      { ticker: 'VOO', percentage: 33.34 },
      { ticker: 'TLT', percentage: 33.33 },
      { ticker: 'GLDM', percentage: 33.33 }
    ]
  ),
  createPortfolio(
    "Leveraged Portfolio",
    "Equal allocation to 3x leveraged ETFs",
    [
      { ticker: 'UPRO', percentage: 25 },
      { ticker: 'TMF', percentage: 25 },
      { ticker: 'UGL', percentage: 25 },
      { ticker: 'EDC', percentage: 25 }
    ]
  ),
  createPortfolio(
    "Risk Parity Portfolio",
    "Equal allocation to risk parity ETFs",
    [
      { ticker: 'RSST', percentage: 50 },
      { ticker: 'RSBT', percentage: 50 }
    ]
  ),
  createPortfolio(
    "Global Equities",
    "Diversified global equity exposure",
    [
      { ticker: 'VOO', percentage: 40 },
      { ticker: 'VEA', percentage: 30 },
      { ticker: 'AVEM', percentage: 30 }
    ]
  ),
  createPortfolio(
    "Digital Assets Portfolio",
    "Exposure to gold and bitcoin",
    [
      { ticker: 'GLDM', percentage: 50 },
      { ticker: 'IBIT', percentage: 50 }
    ]
  )
];

// Function to analyze a portfolio's total exposure
const analyzePortfolio = (portfolio) => {
  const exposures = new Map();
  const assetClasses = new Map();
  let totalExposure = 0;
  
  // Calculate exposures for each ETF in the portfolio
  for (const [ticker, percentage] of portfolio.holdings) {
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

// Parse exposure key back into components
const parseExposureKey = (key) => {
  const [assetClass, marketRegion, factorStyle, sizeFactor] = key.split('|');
  return {
    assetClass,
    marketRegion: marketRegion || undefined,
    factorStyle: factorStyle || undefined,
    sizeFactor: sizeFactor || undefined
  };
};

// Colors for each asset class - vibrant palette
const assetClassColors = {
  'Equity': '#7070f8',
  'U.S. Treasuries': '#7070f8',
  'Managed Futures': '#7070f8',
  'Futures Yield': '#7070f8',
  'Gold': '#7070f8',
  'Bitcoin': '#7070f8'
};

// For region within Equity
const regionColors = {
  'U.S.': '#32d296',
  'International Developed': '#32d296',
  'Emerging': '#32d296'
};

// Component to display portfolio composition as a list view
const PortfolioCompositionList = ({ portfolio }) => {
  const { holdings } = portfolio;
  
  // Convert holdings to an array and sort by allocation percentage (descending)
  const sortedHoldings = Array.from(holdings.entries())
    .map(([ticker, percentage]) => {
      const etf = etfCatalog.find(e => e.ticker === ticker);
      
      // Calculate if ETF is leveraged and gather exposure information
      let totalExposure = 0;
      const constituents = [];
      
      if (etf) {
        for (const [key, amount] of etf.exposures) {
          totalExposure += amount;
          
          // Parse the exposure key to create a readable constituent description
          const { assetClass, marketRegion, factorStyle, sizeFactor } = parseExposureKey(key);
          let description = assetClass;
          
          if (marketRegion || factorStyle || sizeFactor) {
            const details = [];
            if (sizeFactor) details.push(sizeFactor);
            if (factorStyle) details.push(factorStyle);
            if (marketRegion) details.push(marketRegion);
            description += ` (${details.join(' ')})`;
          }
          
          constituents.push(`${description}: ${(amount * 100).toFixed(1)}%`);
        }
      }
      
      const isLeveraged = totalExposure > 1;
      
      return { 
        ticker, 
        percentage, 
        isLeveraged, 
        totalExposure,
        constituents
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-2 text-gray-700">ETF Allocation</h3>
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Constituents</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Leverage</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedHoldings.map((holding, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {holding.ticker}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="max-w-md">
                    {holding.constituents.map((constituent, i) => (
                      <div key={i} className="text-xs mb-1">
                        {constituent}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    holding.isLeveraged 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {holding.isLeveraged ? 'Leveraged' : 'Standard'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                  {holding.totalExposure.toFixed(1)}x
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  {holding.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Component to display asset class exposures as a stacked bar
const AssetClassExposureBar = ({ portfolio }) => {
  const { assetClasses, totalLeverage } = analyzePortfolio(portfolio);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-700">Asset Class Exposure</h3>
        <div className="text-sm font-medium bg-gray-100 px-3 py-1 rounded text-gray-700">
          {totalLeverage.toFixed(2)}x Leverage
        </div>
      </div>
      <div className="h-12 w-full flex rounded-md overflow-hidden border border-gray-200">
        {Array.from(assetClasses.entries()).map(([assetClass, amount], index) => {
          const percentage = (amount / totalLeverage) * 100;
          
          return (
            <div 
              key={index}
              style={{ 
                width: `${percentage}%`,
                backgroundColor: assetClassColors[assetClass]
              }}
              className="flex items-center justify-center text-xs font-medium text-white border-r border-white"
              title={`${assetClass}: ${(amount * 100).toFixed(1)}%`}
            >
              {percentage >= 10 ? `${assetClass} ${percentage.toFixed(0)}%` : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Component to display detailed exposures as visual progress bars
const DetailedExposuresVisual = ({ portfolio }) => {
  // Independent state for each category
  const [showAssetClassRelative, setShowAssetClassRelative] = useState(true);
  const [showMarketRelative, setShowMarketRelative] = useState(true);
  const [showFactorStyleRelative, setShowFactorStyleRelative] = useState(true);
  const [showSizeFactorRelative, setSizeFactorRelative] = useState(true);
  
  const { exposures, totalLeverage } = analyzePortfolio(portfolio);
  
  // Define all possible values for each dimension
  const allAssetClasses = ['Equity', 'U.S. Treasuries', 'Managed Futures', 'Futures Yield', 'Gold', 'Bitcoin'];
  const allMarketRegions = ['U.S.', 'International Developed', 'Emerging'];
  const allFactorStyles = ['Blend', 'Value', 'Growth'];
  const allSizeFactors = ['Large Cap', 'Mid Cap', 'Small Cap'];
  
  // Initialize maps for absolute values with all possible values set to 0
  const assetClassExposuresAbs = new Map();
  const marketRegionExposuresAbs = new Map();
  const factorStyleExposuresAbs = new Map();
  const sizeFactorExposuresAbs = new Map();
  
  // Initialize all maps with zeros
  for (const assetClass of allAssetClasses) {
    assetClassExposuresAbs.set(assetClass, 0);
  }
  
  for (const region of allMarketRegions) {
    marketRegionExposuresAbs.set(region, 0);
  }
  
  for (const style of allFactorStyles) {
    factorStyleExposuresAbs.set(style, 0);
  }
  
  for (const size of allSizeFactors) {
    sizeFactorExposuresAbs.set(size, 0);
  }
  
  // Process the exposures to get absolute values first
  for (const [key, amount] of exposures.entries()) {
    const { assetClass, marketRegion, factorStyle, sizeFactor } = parseExposureKey(key);
    
    // Calculate absolute amount (as percentage of portfolio)
    const absAmount = amount * 100;
    
    // Add to asset class exposures
    const currentAssetAmount = assetClassExposuresAbs.get(assetClass) || 0;
    assetClassExposuresAbs.set(assetClass, currentAssetAmount + absAmount);
    
    // Add to market region exposures (only for Equity)
    if (assetClass === 'Equity' && marketRegion) {
      const currentRegionAmount = marketRegionExposuresAbs.get(marketRegion) || 0;
      marketRegionExposuresAbs.set(marketRegion, currentRegionAmount + absAmount);
    }
    
    // Add to factor style exposures (only for Equity)
    if (assetClass === 'Equity' && factorStyle) {
      const currentStyleAmount = factorStyleExposuresAbs.get(factorStyle) || 0;
      factorStyleExposuresAbs.set(factorStyle, currentStyleAmount + absAmount);
    }
    
    // Add to size factor exposures (only for Equity)
    if (assetClass === 'Equity' && sizeFactor) {
      const currentSizeAmount = sizeFactorExposuresAbs.get(sizeFactor) || 0;
      sizeFactorExposuresAbs.set(sizeFactor, currentSizeAmount + absAmount);
    }
  }
  
  // Now calculate relative values correctly for each category
  
  // For Asset Classes, relative to total leverage
  const assetClassExposuresRel = new Map();
  let totalAssetExposure = 0;
  for (const amount of assetClassExposuresAbs.values()) {
    totalAssetExposure += amount;
  }
  
  for (const [assetClass, amount] of assetClassExposuresAbs.entries()) {
    assetClassExposuresRel.set(assetClass, totalAssetExposure > 0 ? (amount / totalAssetExposure) * 100 : 0);
  }
  
  // For Market Regions, relative to total market exposure
  const marketRegionExposuresRel = new Map();
  let totalMarketExposure = 0;
  for (const amount of marketRegionExposuresAbs.values()) {
    totalMarketExposure += amount;
  }
  
  for (const [region, amount] of marketRegionExposuresAbs.entries()) {
    marketRegionExposuresRel.set(region, totalMarketExposure > 0 ? (amount / totalMarketExposure) * 100 : 0);
  }
  
  // For Factor Styles, relative to total factor style exposure
  const factorStyleExposuresRel = new Map();
  let totalStyleExposure = 0;
  for (const amount of factorStyleExposuresAbs.values()) {
    totalStyleExposure += amount;
  }
  
  for (const [style, amount] of factorStyleExposuresAbs.entries()) {
    factorStyleExposuresRel.set(style, totalStyleExposure > 0 ? (amount / totalStyleExposure) * 100 : 0);
  }
  
  // For Size Factors, relative to total size factor exposure
  const sizeFactorExposuresRel = new Map();
  let totalSizeExposure = 0;
  for (const amount of sizeFactorExposuresAbs.values()) {
    totalSizeExposure += amount;
  }
  
  for (const [size, amount] of sizeFactorExposuresAbs.entries()) {
    sizeFactorExposuresRel.set(size, totalSizeExposure > 0 ? (amount / totalSizeExposure) * 100 : 0);
  }
  
  // Create dimension-specific colors
  const factorStyleColors = {
    'Blend': '#ffbb00',
    'Value': '#ffbb00',
    'Growth': '#ffbb00'
  };
  
  const sizeFactorColors = {
    'Large Cap': '#ff6b6b',
    'Mid Cap': '#ff6b6b',
    'Small Cap': '#ff6b6b'
  };
  
  // Helper component for exposure category
  const ExposureCategory = ({ 
    title, 
    exposuresAbs,
    exposuresRel,
    colors,
    borderColor,
    showRelative,
    setShowRelative
  }) => {
    // Determine which exposure set to use
    const exposuresToUse = showRelative ? exposuresRel : exposuresAbs;
    
    // Convert to array and sort by value (descending)
    const sortedExposures = Array.from(exposuresToUse.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium" style={{borderLeft: `4px solid ${borderColor}`, paddingLeft: '8px'}}>
            {title} {showRelative ? "(Relative)" : "(Absolute)"}
          </h3>
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <span className="mr-2 text-sm font-medium text-gray-500">Relative</span>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full" style={{backgroundColor: showRelative ? borderColor : '#e5e7eb'}}>
                <input 
                  type="checkbox" 
                  className="absolute w-6 h-6 opacity-0 cursor-pointer z-10"
                  checked={!showRelative} 
                  onChange={() => setShowRelative(!showRelative)} 
                />
                <span 
                  className={`absolute left-0 top-0 w-6 h-6 transition-transform duration-200 transform ${!showRelative ? 'translate-x-6' : 'translate-x-0'} bg-white border border-gray-300 rounded-full`}
                />
                <span 
                  className={`block h-full rounded-full`}
                  style={{backgroundColor: !showRelative ? borderColor : '#e5e7eb'}}
                />
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Absolute</span>
            </label>
          </div>
        </div>
        <div className="space-y-4">
          {sortedExposures.map(([name, value], index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">{name}</span>
                <span className="text-sm font-medium text-gray-900">{value.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full" 
                  style={{ 
                    width: `${Math.min(value, 100)}%`,
                    backgroundColor: colors[name] || '#D1D5DB'
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <ExposureCategory 
        title="Asset Class Exposure" 
        exposuresAbs={assetClassExposuresAbs}
        exposuresRel={assetClassExposuresRel}
        colors={assetClassColors}
        borderColor="#7070f8"
        showRelative={showAssetClassRelative}
        setShowRelative={setShowAssetClassRelative}
      />
      
      <ExposureCategory 
        title="Market Exposure" 
        exposuresAbs={marketRegionExposuresAbs}
        exposuresRel={marketRegionExposuresRel}
        colors={regionColors}
        borderColor="#32d296"
        showRelative={showMarketRelative}
        setShowRelative={setShowMarketRelative}
      />
      
      <ExposureCategory 
        title="Factor Style Exposure" 
        exposuresAbs={factorStyleExposuresAbs}
        exposuresRel={factorStyleExposuresRel}
        colors={factorStyleColors}
        borderColor="#ffbb00"
        showRelative={showFactorStyleRelative}
        setShowRelative={setShowFactorStyleRelative}
      />
      
      <ExposureCategory 
        title="Size Factor Exposure" 
        exposuresAbs={sizeFactorExposuresAbs}
        exposuresRel={sizeFactorExposuresRel}
        colors={sizeFactorColors}
        borderColor="#ff6b6b"
        showRelative={showSizeFactorRelative}
        setShowRelative={setSizeFactorRelative}
      />
    </div>
  );
};

// Main component
const ETFPortfolioVisualizer = () => {
  const [selectedPortfolio, setSelectedPortfolio] = useState(examplePortfolios[0]);

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">ETF Portfolio Exposure Visualizer</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-700">Select Portfolio:</label>
        <div className="flex flex-wrap gap-3">
          {examplePortfolios.map((portfolio, index) => (
            <button
              key={index}
              onClick={() => setSelectedPortfolio(portfolio)}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedPortfolio.name === portfolio.name
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {portfolio.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">{selectedPortfolio.name}</h2>
          <p className="text-gray-600">{selectedPortfolio.description}</p>
        </div>
        
        <PortfolioCompositionList portfolio={selectedPortfolio} />
        <AssetClassExposureBar portfolio={selectedPortfolio} />
        <DetailedExposuresVisual portfolio={selectedPortfolio} />
      </div>
    </div>
  );
};

export default ETFPortfolioVisualizer; 