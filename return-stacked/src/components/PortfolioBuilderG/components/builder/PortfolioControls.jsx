import React, { useState } from 'react';

/**
 * Portfolio Controls component for template loading and management
 */
const PortfolioControls = ({ examplePortfolios, savedPortfolios, loadPortfolio, onDeletePortfolio }) => {
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [portfolioToDelete, setPortfolioToDelete] = useState(null);

    // Handle delete button click
    const handleDeleteClick = (portfolio, e) => {
        e.stopPropagation(); // Prevent dropdown from closing
        setPortfolioToDelete(portfolio);
        setShowConfirmDelete(true);
    };

    // Confirm deletion
    const confirmDelete = () => {
        if (portfolioToDelete) {
            onDeletePortfolio(portfolioToDelete.name);
            setShowConfirmDelete(false);
            setPortfolioToDelete(null);
        }
    };

    // Cancel deletion
    const cancelDelete = () => {
        setShowConfirmDelete(false);
        setPortfolioToDelete(null);
    };

    return (
        <div className="mb-6">
            {/* Saved and Example Portfolios */}
            <div className="mb-4">
                <h3 className="text-md font-medium mb-2">Saved Portfolios</h3>

                <div className="relative">
                    <select
                        className="block w-full px-3 py-2 text-gray-800 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent appearance-none bg-white"
                        onChange={(e) => {
                            if (e.target.value) {
                                const [type, index] = e.target.value.split('-');
                                let selectedPortfolio;

                                if (type === 'saved') {
                                    selectedPortfolio = savedPortfolios[parseInt(index)];
                                } else {
                                    selectedPortfolio = examplePortfolios[parseInt(index)];
                                }

                                loadPortfolio(selectedPortfolio, type === 'saved');
                                e.target.value = ''; // Reset after selection
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>
                            Select a portfolio...
                        </option>

                        {savedPortfolios && savedPortfolios.length > 0 && (
                            <optgroup label="Your Saved Portfolios">
                                {savedPortfolios.map((portfolio, index) => (
                                    <option key={`saved-${index}`} value={`saved-${index}`}>
                                        {portfolio.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}

                        {examplePortfolios && examplePortfolios.length > 0 && (
                            <optgroup label="Example Portfolios">
                                {examplePortfolios.map((portfolio, index) => (
                                    <option key={`example-${index}`} value={`example-${index}`}>
                                        {portfolio.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
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

                {/* Display saved portfolios as cards with delete buttons */}
                {savedPortfolios && savedPortfolios.length > 0 && (
                    <div className="mt-4">
                        <div className="text-sm text-gray-600 mb-2">Your Saved Portfolios:</div>
                        <div className="flex flex-wrap gap-2">
                            {savedPortfolios.map((portfolio, index) => (
                                <div
                                    key={`card-${index}`}
                                    className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2 w-full"
                                >
                                    <div
                                        className="flex-grow cursor-pointer hover:text-blue-600"
                                        onClick={() => loadPortfolio(portfolio, true)}
                                    >
                                        {portfolio.name}
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteClick(portfolio, e)}
                                        className="text-red-500 hover:text-red-700 ml-2"
                                        title="Delete portfolio"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Delete Portfolio</h2>
                        <p className="mb-4 text-gray-600">
                            Are you sure you want to delete the portfolio &quot;{portfolioToDelete?.name}&quot;? This
                            action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioControls;
