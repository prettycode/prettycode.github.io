import React from 'react';
import PortfolioBuilderD from '@/components/PortfolioBuilderD';

export const metadata = {
  title: 'Portfolio D - Return Stacked',
  description: 'Portfolio Builder D - Advanced ETF portfolio construction tool',
};

export default function PortfolioD() {
  return (
    <div className="container mx-auto py-8">
      <PortfolioBuilderD />
    </div>
  );
} 