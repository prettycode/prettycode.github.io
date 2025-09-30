import React, { useState, useEffect, useRef } from 'react';

const SaveModal = ({ isOpen, onClose, onSave, initialName }) => {
    const [portfolioName, setPortfolioName] = useState(initialName || '');
    const inputRef = useRef(null);

    // Focus the input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current.focus();
            }, 100);
        }
    }, [isOpen]);

    // Handle save
    const handleSave = () => {
        if (portfolioName.trim()) {
            onSave(portfolioName.trim());
            setPortfolioName('');
        }
    };

    // Handle key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-full mx-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Save Portfolio</h2>

                <div className="mb-4">
                    <label htmlFor="portfolio-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Portfolio Name
                    </label>
                    <input
                        ref={inputRef}
                        id="portfolio-name"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={portfolioName}
                        onChange={(e) => setPortfolioName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Enter a name for your portfolio"
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!portfolioName.trim()}
                        className={`px-4 py-2 rounded-md ${
                            portfolioName.trim()
                                ? 'bg-gray-800 text-white hover:bg-gray-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveModal;
