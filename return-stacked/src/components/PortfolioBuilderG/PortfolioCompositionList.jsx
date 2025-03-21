import React from 'react';
import { etfCatalog, parseExposureKey } from './etfData';

// Component to display portfolio composition as a list view
const PortfolioCompositionList = ({ portfolio }) => {
  const { holdings } = portfolio;
  
  // Convert holdings to an array and sort by allocation percentage (descending)
  const sortedHoldings = Array.from(holdings.entries())
    .map(([ticker, holdingData]) => {
      // Handle both object format (for custom portfolios) and number format (for example portfolios)
      const percentage = typeof holdingData === 'object' ? holdingData.percentage : holdingData;
      const isDisabled = typeof holdingData === 'object' && holdingData.disabled;
      
      // Skip disabled holdings
      if (isDisabled) return null;
      
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
    .filter(holding => holding !== null) // Remove null entries (disabled holdings)
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
            {sortedHoldings.length > 0 ? (
              sortedHoldings.map((holding, index) => (
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
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  No active ETFs in portfolio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PortfolioCompositionList; 