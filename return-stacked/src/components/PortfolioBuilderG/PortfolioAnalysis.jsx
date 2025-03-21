import React from "react";
import AssetClassExposureBar from "./AssetClassExposureBar";
import DetailedExposuresVisual from "./DetailedExposuresVisual";

// Portfolio Analysis component
const PortfolioAnalysis = ({ portfolio }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-5">
        Portfolio Analysis
      </h2>
      {portfolio.holdings.size === 0 && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md text-gray-700">
          Select ETFs or load a portfolio template to start building your
          portfolio. Your portfolio analysis will appear here.
        </div>
      )}

      {portfolio.holdings.size > 0 && (
        <>
          <AssetClassExposureBar portfolio={portfolio} />
          <DetailedExposuresVisual portfolio={portfolio} />
        </>
      )}
    </div>
  );
};

export default PortfolioAnalysis;
