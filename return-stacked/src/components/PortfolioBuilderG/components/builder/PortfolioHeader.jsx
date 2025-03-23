import React, { memo } from 'react';

const PortfolioHeader = memo(
    ({
        examplePortfolios,
        loadExamplePortfolio,
        showDetailColumns,
        setShowDetailColumns,
        totalAllocation,
        resetPortfolio,
        saveCustomPortfolio,
    }) => {
        // Determine if the total allocation is valid for saving
        const isValidAllocation = Math.abs(totalAllocation - 100) <= 0.1;

        return (
            <div>
                <div className="mb-4">
                    <h3 className="text-md font-medium mb-2">Portfolio Templates</h3>
                    <div className="relative">
                        <select
                            className="block w-full px-3 py-2 text-gray-800 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent appearance-none bg-white"
                            onChange={(e) => {
                                if (e.target.value) {
                                    const selectedPortfolio = examplePortfolios[parseInt(e.target.value)];
                                    loadExamplePortfolio(selectedPortfolio);
                                    e.target.value = ''; // Reset after selection
                                }
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>
                                Select a portfolio template...
                            </option>
                            {examplePortfolios.map((portfolio, index) => (
                                <option key={index} value={index}>
                                    {portfolio.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                ></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={showDetailColumns}
                            onChange={(e) => setShowDetailColumns(e.target.checked)}
                            className="mr-2"
                        />
                        <span>Show Detail Columns</span>
                    </div>
                    <div className="flex items-center">
                        <span>Total Allocation: {totalAllocation.toFixed(2)}%</span>
                        {isValidAllocation ? (
                            <span className="text-green-500 ml-2">Valid</span>
                        ) : (
                            <span className="text-red-500 ml-2">Invalid</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);

export default PortfolioHeader;
