"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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

const ExposureBar = ({ value, maxValue, label }) => {
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
          className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
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
  // Dummy data for portfolio exposures
  const dummyExposures = {
    'Asset Class': {
      'Equity': 0.45,
      'U.S. Treasuries': 0.25,
      'Managed Futures': 0.15,
      'Futures Yield': 0.10,
      'Gold': 0.08,
      'Bitcoin': 0.05
    },
    'Factor Style': {
      'Blend': 0.70,
      'Value': 0.20,
      'Growth': 0.10
    },
    'Size Factor': {
      'Large Cap': 0.75,
      'Small Cap': 0.25
    },
    'Market': {
      'U.S.': 0.65,
      'International Developed': 0.25,
      'Emerging': 0.10
    }
  };

  const categoryExposures = dummyExposures;

  return (
    <div className="p-4 max-w-4xl mx-auto">

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Exposures</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(EXPOSURE_MAPPING).map(([category, subcategories]) => (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-semibold mb-4">{category}</h3>
              {Object.entries(subcategories).map(([subcategory]) => {
                const exposure = categoryExposures[category][subcategory] * 100; // Convert to percentage
                const maxExposure = Math.max(
                  ...Object.values(categoryExposures[category]).map(v => v * 100),
                  100
                );
                
                return (
                  <ExposureBar 
                    key={subcategory}
                    value={exposure}
                    maxValue={maxExposure}
                    label={subcategory}
                  />
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioVisualizer; 