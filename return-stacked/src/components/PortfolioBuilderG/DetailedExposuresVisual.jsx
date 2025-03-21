import React, { useState } from "react";
import {
  analyzePortfolio,
  parseExposureKey,
  assetClassColors,
  regionColors,
} from "./etfData";

// Component to display detailed exposures as visual progress bars
const DetailedExposuresVisual = ({ portfolio }) => {
  // Shared states for display settings
  const [showRelative, setShowRelative] = useState(true);
  const [sortByValue, setSortByValue] = useState(false);
  const [hideZeroValues, setHideZeroValues] = useState(false);

  const { exposures, totalLeverage } = analyzePortfolio(portfolio);

  // Define all possible values for each dimension
  const allAssetClasses = [
    "Equity",
    "U.S. Treasuries",
    "Managed Futures",
    "Futures Yield",
    "Gold",
    "Bitcoin",
  ];
  const allMarketRegions = ["U.S.", "International Developed", "Emerging"];
  const allFactorStyles = ["Blend", "Value", "Growth"];
  const allSizeFactors = ["Large Cap", "Mid Cap", "Small Cap"];

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
    const { assetClass, marketRegion, factorStyle, sizeFactor } =
      parseExposureKey(key);

    // Calculate absolute amount (as percentage of portfolio)
    const absAmount = amount * 100;

    // Add to asset class exposures
    const currentAssetAmount = assetClassExposuresAbs.get(assetClass) || 0;
    assetClassExposuresAbs.set(assetClass, currentAssetAmount + absAmount);

    // Add to market region exposures (only for Equity)
    if (assetClass === "Equity" && marketRegion) {
      const currentRegionAmount =
        marketRegionExposuresAbs.get(marketRegion) || 0;
      marketRegionExposuresAbs.set(
        marketRegion,
        currentRegionAmount + absAmount
      );
    }

    // Add to factor style exposures (only for Equity)
    if (assetClass === "Equity" && factorStyle) {
      const currentStyleAmount = factorStyleExposuresAbs.get(factorStyle) || 0;
      factorStyleExposuresAbs.set(factorStyle, currentStyleAmount + absAmount);
    }

    // Add to size factor exposures (only for Equity)
    if (assetClass === "Equity" && sizeFactor) {
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
    assetClassExposuresRel.set(
      assetClass,
      totalAssetExposure > 0 ? (amount / totalAssetExposure) * 100 : 0
    );
  }

  // For Market Regions, relative to total market exposure
  const marketRegionExposuresRel = new Map();
  let totalMarketExposure = 0;
  for (const amount of marketRegionExposuresAbs.values()) {
    totalMarketExposure += amount;
  }

  for (const [region, amount] of marketRegionExposuresAbs.entries()) {
    marketRegionExposuresRel.set(
      region,
      totalMarketExposure > 0 ? (amount / totalMarketExposure) * 100 : 0
    );
  }

  // For Factor Styles, relative to total factor style exposure
  const factorStyleExposuresRel = new Map();
  let totalStyleExposure = 0;
  for (const amount of factorStyleExposuresAbs.values()) {
    totalStyleExposure += amount;
  }

  for (const [style, amount] of factorStyleExposuresAbs.entries()) {
    factorStyleExposuresRel.set(
      style,
      totalStyleExposure > 0 ? (amount / totalStyleExposure) * 100 : 0
    );
  }

  // For Size Factors, relative to total size factor exposure
  const sizeFactorExposuresRel = new Map();
  let totalSizeExposure = 0;
  for (const amount of sizeFactorExposuresAbs.values()) {
    totalSizeExposure += amount;
  }

  for (const [size, amount] of sizeFactorExposuresAbs.entries()) {
    sizeFactorExposuresRel.set(
      size,
      totalSizeExposure > 0 ? (amount / totalSizeExposure) * 100 : 0
    );
  }

  // Get the equity blue color from assetClassColors
  const equityBlue = assetClassColors.Equity;

  // Create dimension-specific colors all using equity blue
  const factorStyleColors = {
    Blend: equityBlue,
    Value: equityBlue,
    Growth: equityBlue,
  };

  const sizeFactorColors = {
    "Large Cap": equityBlue,
    "Mid Cap": equityBlue,
    "Small Cap": equityBlue,
  };

  // Create a map with all market regions using equity blue
  const marketRegionColors = {
    "U.S.": equityBlue,
    "International Developed": equityBlue,
    Emerging: equityBlue,
  };

  // Helper component for exposure category
  const ExposureCategory = ({
    title,
    exposuresAbs,
    exposuresRel,
    colors,
    borderColor,
  }) => {
    // Determine which exposure set to use based on the shared toggle
    const exposuresToUse = showRelative ? exposuresRel : exposuresAbs;

    // Convert to array and prepare for display
    let exposureItems = Array.from(exposuresToUse.entries());

    // Apply sorting if enabled, otherwise maintain original order
    if (sortByValue) {
      exposureItems = exposureItems.sort((a, b) => b[1] - a[1]);
    }

    // Filter out zero values if hideZeroValues is enabled
    if (hideZeroValues) {
      exposureItems = exposureItems.filter(([_, value]) => value > 0);
    }

    return (
      <div className="mb-7">
        <h3
          className="text-lg font-medium mb-4"
          style={{ borderLeft: `4px solid ${borderColor}`, paddingLeft: "8px" }}
        >
          {title}
        </h3>
        <div className="space-y-4 ml-3">
          {exposureItems.length > 0 ? (
            exposureItems.map(([name, value], index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {name}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {value.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(value, 100)}%`,
                      backgroundColor: colors[name] || "#D1D5DB",
                    }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">
              No exposures to display
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Display controls - toggles in a flex container */}
      <div className="flex flex-wrap justify-end mb-2 gap-4">
        {/* Relative/Absolute toggle */}
        <label className="inline-flex items-center cursor-pointer">
          <span className="mr-2 text-sm font-medium text-gray-500">
            Relative
          </span>
          <div
            className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full"
            style={{ backgroundColor: showRelative ? "#7070f8" : "#e5e7eb" }}
          >
            <input
              type="checkbox"
              className="absolute w-6 h-6 opacity-0 cursor-pointer z-10"
              checked={!showRelative}
              onChange={() => setShowRelative(!showRelative)}
            />
            <span
              className={`absolute left-0 top-0 w-6 h-6 transition-transform duration-200 transform ${
                !showRelative ? "translate-x-6" : "translate-x-0"
              } bg-white border border-gray-300 rounded-full`}
            />
            <span
              className={`block h-full rounded-full`}
              style={{ backgroundColor: !showRelative ? "#7070f8" : "#e5e7eb" }}
            />
          </div>
          <span className="ml-2 text-sm font-medium text-gray-500">
            Absolute
          </span>
        </label>

        {/* Sort/Fixed Order toggle */}
        <label className="inline-flex items-center cursor-pointer">
          <span className="mr-2 text-sm font-medium text-gray-500">
            Fixed Order
          </span>
          <div
            className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full"
            style={{ backgroundColor: !sortByValue ? "#7070f8" : "#e5e7eb" }}
          >
            <input
              type="checkbox"
              className="absolute w-6 h-6 opacity-0 cursor-pointer z-10"
              checked={sortByValue}
              onChange={() => setSortByValue(!sortByValue)}
            />
            <span
              className={`absolute left-0 top-0 w-6 h-6 transition-transform duration-200 transform ${
                sortByValue ? "translate-x-6" : "translate-x-0"
              } bg-white border border-gray-300 rounded-full`}
            />
            <span
              className={`block h-full rounded-full`}
              style={{ backgroundColor: sortByValue ? "#7070f8" : "#e5e7eb" }}
            />
          </div>
          <span className="ml-2 text-sm font-medium text-gray-500">
            Sort by Value
          </span>
        </label>

        {/* Show/Hide Zero Values toggle */}
        <label className="inline-flex items-center cursor-pointer">
          <span className="mr-2 text-sm font-medium text-gray-500">
            Show All
          </span>
          <div
            className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full"
            style={{ backgroundColor: !hideZeroValues ? "#7070f8" : "#e5e7eb" }}
          >
            <input
              type="checkbox"
              className="absolute w-6 h-6 opacity-0 cursor-pointer z-10"
              checked={hideZeroValues}
              onChange={() => setHideZeroValues(!hideZeroValues)}
            />
            <span
              className={`absolute left-0 top-0 w-6 h-6 transition-transform duration-200 transform ${
                hideZeroValues ? "translate-x-6" : "translate-x-0"
              } bg-white border border-gray-300 rounded-full`}
            />
            <span
              className={`block h-full rounded-full`}
              style={{
                backgroundColor: hideZeroValues ? "#7070f8" : "#e5e7eb",
              }}
            />
          </div>
          <span className="ml-2 text-sm font-medium text-gray-500">
            Hide Zero
          </span>
        </label>
      </div>

      <ExposureCategory
        title="Asset Class Exposure"
        exposuresAbs={assetClassExposuresAbs}
        exposuresRel={assetClassExposuresRel}
        colors={assetClassColors}
        borderColor="#7070f8"
      />

      <ExposureCategory
        title="Market Exposure"
        exposuresAbs={marketRegionExposuresAbs}
        exposuresRel={marketRegionExposuresRel}
        colors={marketRegionColors}
        borderColor="#32d296"
      />

      <ExposureCategory
        title="Factor Style Exposure"
        exposuresAbs={factorStyleExposuresAbs}
        exposuresRel={factorStyleExposuresRel}
        colors={factorStyleColors}
        borderColor="#ffbb00"
      />

      <ExposureCategory
        title="Size Factor Exposure"
        exposuresAbs={sizeFactorExposuresAbs}
        exposuresRel={sizeFactorExposuresRel}
        colors={sizeFactorColors}
        borderColor="#ff6b6b"
      />
    </div>
  );
};

export default DetailedExposuresVisual;
