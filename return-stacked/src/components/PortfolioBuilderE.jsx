"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

// Asset class groupings with exact values from the image
const EXPOSURES_DATA = {
  "Asset Class": [
    { key: 'Equity', value: 89.00 },
    { key: 'U.S. Treasuries', value: 35.00 },
    { key: 'Managed Futures', value: 30.00 },
    { key: 'Futures Yield', value: 25.00 },
    { key: 'Gold', value: 14.00 },
    { key: 'Bitcoin', value: 5.00 }
  ],
  "Factor Style": [
    { key: 'Blend', value: 89.00 },
    { key: 'Value', value: 0.00 },
    { key: 'Growth', value: 0.00 }
  ],
  "Size Factor": [
    { key: 'Large Cap', value: 89.00 },
    { key: 'Small Cap', value: 0.00 }
  ],
  "Market": [
    { key: 'U.S.', value: 112.00 },
    { key: 'International Developed', value: 9.00 },
    { key: 'Emerging Market', value: 3.00 }
  ]
};

// Define colors for each asset class
const COLOR_MAP = {
  'Equity': 'bg-blue-600',
  'U.S. Treasuries': 'bg-green-700',
  'Managed Futures': 'bg-purple-600',
  'Futures Yield': 'bg-amber-600',
  'Gold': 'bg-yellow-500',
  'Bitcoin': 'bg-orange-500',
  'Blend': 'bg-blue-600',
  'Value': 'bg-gray-200',
  'Growth': 'bg-gray-200',
  'Large Cap': 'bg-blue-600',
  'Small Cap': 'bg-gray-200',
  'U.S.': 'bg-blue-600',
  'International Developed': 'bg-blue-400',
  'Emerging Market': 'bg-blue-300'
};

const PortfolioBuilderE = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="shadow-sm border rounded-2xl overflow-hidden">
        <CardContent className="p-10">
          <h2 className="text-xl font-semibold mb-8">Portfolio Exposures</h2>
          
          <div className="space-y-12">
            {Object.entries(EXPOSURES_DATA).map(([category, items]) => (
              <div key={category} className="space-y-5">
                <h3 className="text-lg font-medium">{category}</h3>
                <div className="space-y-6">
                  {items.map(item => (
                    <div key={item.key}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm text-gray-800">{item.key}</span>
                        <span className="text-sm text-gray-800">{item.value.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${COLOR_MAP[item.key]} h-2 rounded-full`} 
                          style={{ width: `${Math.min(100, item.value)}%` }}>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioBuilderE; 