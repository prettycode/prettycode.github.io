"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PortfolioBuilder } from "./PortfolioBuilder";

const ETF_DATA = {
  AVUV: {
    'Small Cap Value U.S.': 1
  },
  RSST: { 
    'Large Cap Blend U.S.': 1,
    'Managed Futures': 1
  },
  RSBT: {
    'U.S. Treasuries': 1,
    'Managed Futures': 1
  },
  RSSY: {
    'Large Cap Blend U.S.': 1,
    'Futures Yield': 1
  },
  RSBY: {
    'U.S. Treasuries': 1,
    'Futures Yield': 1
  },
  RSSB: {
    'Large Cap Blend U.S.': 0.6,
    'Large Cap Blend International Developed': 0.3,
    'Large Cap Blend Emerging Market': 0.1,
    'U.S. Treasuries': 1
  },
  TMF: {
    'U.S. Treasuries': 3
  },
  GOVZ: {
    'U.S. Treasuries': 1.6
  },
  TLT: {
    'U.S. Treasuries': 1
  },
  UGL: {
    'Gold': 2
  },
  GLDM: {
    'Gold': 1
  },
  GDE: {
    'Large Cap Blend U.S.': 0.9,
    'Gold': 0.9
  },
  BTGD: {
    'Bitcoin': 1,
    'Gold': 1
  },
  IBIT: {
    'Bitcoin': 1
  },
  UPRO: {
    'Large Cap Blend U.S.': 3
  },
  SSO: {
    'Large Cap Blend U.S.': 2
  },
  VOO: {
    'Large Cap Blend U.S.': 1
  },
  QQQM: {
    'Large Cap Growth U.S.': 1
  },
  VEA: {
    'Large Cap Blend International': 1
  },
  AVDV: {
    'Small Cap Value International': 1
  },
  AVEM: {
    'Large Cap Blend Emerging': 1
  },
  AVEE: {
    'Small Cap Blend Emerging': 1
  },
  DGS: {
    'Small Cap Value Emerging': 1
  },
  EDC: {
    'Large Cap Blend Emerging': 3
  }
};

// Helper function to categorize exposures
const EXPOSURE_MAPPING = {
  'Asset Class': {
    'Equity': ['Large Cap', 'Small Cap'],
    'U.S. Treasuries': ['Treasuries'],
    'Managed Futures': ['Managed Futures'],
    'Futures Yield': ['Futures Yield'],
    'Gold': ['Gold'],
    'Bitcoin': ['Bitcoin']
  },
  'Market': {
    'U.S.': ['U.S.'],
    'International Developed': ['International Developed'],
    'Emerging': ['Emerging Market']
  },
  'Factor Style': {
    'Blend': ['Blend'],
    'Value': ['Value'],
    'Growth': ['Growth']
  },
  'Size Factor': {
    'Large Cap': ['Large Cap'],
    'Small Cap': ['Small Cap']
  }
};

// Define a color palette for different categories
const CATEGORY_COLORS = {
  'Asset Class': {
    base: 'bg-indigo-500',
    light: 'bg-indigo-400',
    text: 'text-indigo-900',
    header: 'border-l-4 border-indigo-500'
  },
  'Market': {
    base: 'bg-emerald-500',
    light: 'bg-emerald-400',
    text: 'text-emerald-900',
    header: 'border-l-4 border-emerald-500'
  },
  'Factor Style': {
    base: 'bg-amber-500',
    light: 'bg-amber-400',
    text: 'text-amber-900',
    header: 'border-l-4 border-amber-500'
  },
  'Size Factor': {
    base: 'bg-rose-500',
    light: 'bg-rose-400',
    text: 'text-rose-900',
    header: 'border-l-4 border-rose-500'
  }
};

// Helper function to map ETF exposures to our visualization categories
const mapExposuresToCategories = (exposures) => {
  // Default structured exposures object
  const result = {
    'Asset Class': {
      'Equity': 0.45,
      'U.S. Treasuries': 0.25,
      'Managed Futures': 0.15,
      'Futures Yield': 0.10,
      'Gold': 0.08,
      'Bitcoin': 0.05
    },
    'Market': {
      'U.S.': 0.65,
      'International Developed': 0.25,
      'Emerging': 0.10
    },
    'Factor Style': {
      'Blend': 0.70,
      'Value': 0.20,
      'Growth': 0.10
    },
    'Size Factor': {
      'Large Cap': 0.75,
      'Small Cap': 0.25
    }
  };

  // If we have actual exposures, map them to our categories
  if (exposures) {
    // Asset Class mapping
    if (exposures['Equities'] !== undefined) {
      result['Asset Class']['Equity'] = exposures['Equities'];
    }
    if (exposures['Bonds'] !== undefined) {
      result['Asset Class']['U.S. Treasuries'] = exposures['Bonds'];
    }
    if (exposures['Managed Futures'] !== undefined) {
      result['Asset Class']['Managed Futures'] = exposures['Managed Futures'];
    }
    if (exposures['Yield'] !== undefined) {
      result['Asset Class']['Futures Yield'] = exposures['Yield'];
    }
    if (exposures['Gold'] !== undefined) {
      result['Asset Class']['Gold'] = exposures['Gold'];
    }
    if (exposures['Bitcoin'] !== undefined) {
      result['Asset Class']['Bitcoin'] = exposures['Bitcoin'];
    }

    // Market mapping from equity exposures
    const totalEquities = exposures['Equities'] || 0;
    const usEquities = exposures['U.S. Equities'] || 0;
    const exUsEquities = exposures['Ex-U.S. Equities'] || 0;
    
    if (totalEquities > 0) {
      result['Market']['U.S.'] = usEquities / totalEquities;
      // For simplicity, we're assuming all Ex-U.S. is International Developed
      result['Market']['International Developed'] = exUsEquities / totalEquities;
      result['Market']['Emerging'] = 0.1; // Default value
    }
  }

  return result;
};

const ExposureBar = ({ value, maxValue, label, color = 'bg-blue-400' }) => {
  const percentage = (value / maxValue) * 100;
  
  // Format the percentage to remove unnecessary decimal places
  const formatPercentage = (num) => {
    // If it's a whole number (ends with .00), show without decimals
    if (num % 1 === 0) {
      return `${Math.floor(num)}%`;
    }
    // Otherwise show with 2 decimal places
    return `${num.toFixed(2)}%`;
  };
  
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-medium">{formatPercentage(value)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`${color} h-2.5 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
};

const DEFAULT_PORTFOLIO = {
  'RSSB': 30.0,
  'RSST': 25.0,
  'RSSY': 25.0,
  'RSBT': 5.0,
  'GDE': 10.0,
  'BTGD': 5.0
};

const PortfolioVisualizer = () => {
  const [categoryExposures, setCategoryExposures] = useState(mapExposuresToCategories());
  const [totalLeverage, setTotalLeverage] = useState(1.0);

  // Handle exposure changes from the PortfolioBuilder
  const handleExposuresChange = (exposures, leverage) => {
    // Map the exposures to our visualization categories
    const mappedExposures = mapExposuresToCategories(exposures);
    setCategoryExposures(mappedExposures);
    setTotalLeverage(leverage);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 gap-8">
        {/* Portfolio Builder Section */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioBuilder 
              initialETFs={['RSSB', 'RSST']} 
              initialAllocations={{ 'RSSB': 60, 'RSST': 40 }}
              onExposuresChange={handleExposuresChange}
              showExposures={false}  // Hide the built-in exposures since we show them separately
            />
          </CardContent>
        </Card>

        {/* Total Leverage Display */}
        <Card>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Portfolio's Total Leverage</span>
              <span className="text-xl font-bold">{totalLeverage.toFixed(2)}x</span>
            </div>
          </CardContent>
        </Card>

        {Object.entries(EXPOSURE_MAPPING).map(([category, subcategories]) => (
          <Card key={category} className="shadow-sm">
            <CardHeader className={CATEGORY_COLORS[category].header}>
              <CardTitle>{category} Exposure (Relative)</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(subcategories).map(([subcategory]) => {
                const exposure = (categoryExposures[category]?.[subcategory] || 0) * 100; // Convert to percentage
                const maxExposure = Math.max(
                  ...Object.values(categoryExposures[category] || {}).map(v => v * 100),
                  100
                );
                
                return (
                  <ExposureBar 
                    key={subcategory}
                    value={exposure}
                    maxValue={maxExposure}
                    label={subcategory}
                    color={CATEGORY_COLORS[category].light}
                  />
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PortfolioVisualizer; 