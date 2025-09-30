import React, { memo } from 'react';

const AllocationControls = memo(
    ({
        ticker,
        percentage,
        locked,
        disabled,
        showDetailColumns,
        tempInputs,
        handleInputChange,
        handleInputBlur,
        updateETFAllocation,
    }) => {
        // Determine the current input value (from temp input or formatted percentage)
        const inputValue = tempInputs[ticker] !== undefined ? tempInputs[ticker] : percentage.toFixed(1);

        return (
            <div className="flex items-center gap-2 w-full">
                {!showDetailColumns && (
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={(e) => updateETFAllocation(ticker, e.target.value)}
                        disabled={locked || disabled}
                        className={`flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700`}
                    />
                )}
            </div>
        );
    }
);

export default AllocationControls;
