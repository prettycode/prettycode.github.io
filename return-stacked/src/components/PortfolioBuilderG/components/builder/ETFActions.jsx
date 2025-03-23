import React, { memo } from 'react';

const ETFActions = memo(
    ({ ticker, locked, disabled, portfolioSize, toggleLockETF, toggleDisableETF, removeETFFromPortfolio }) => {
        // Memoize the UI state conditions
        const canRemove = portfolioSize > 1;

        return (
            <div className="flex gap-2 justify-end">
                <button
                    onClick={() => toggleLockETF(ticker)}
                    className={`p-1 rounded-full hover:bg-gray-100 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
                        locked ? 'text-yellow-500' : 'text-gray-400'
                    }`}
                    title={locked ? 'Unlock' : 'Lock'}
                    disabled={disabled}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        {locked ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                            />
                        )}
                    </svg>
                </button>
                <button
                    onClick={() => toggleDisableETF(ticker)}
                    className={`p-1 rounded-full hover:bg-gray-100 ${disabled ? 'text-red-500' : 'text-gray-400'}`}
                    title={disabled ? 'Enable' : 'Disable'}
                >
                    {disabled ? (
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
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            ></path>
                        </svg>
                    ) : (
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
                                d="M15 12a3 3 0 01-6 0 3 3 0 016 0z"
                            ></path>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            ></path>
                        </svg>
                    )}
                </button>
                <button
                    onClick={() => (canRemove ? removeETFFromPortfolio(ticker) : null)}
                    className={`p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 ${
                        !canRemove ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Delete"
                    disabled={!canRemove}
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
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison function to prevent unnecessary re-renders
        return (
            prevProps.ticker === nextProps.ticker &&
            prevProps.locked === nextProps.locked &&
            prevProps.disabled === nextProps.disabled &&
            prevProps.portfolioSize === nextProps.portfolioSize
        );
    }
);

export default ETFActions;
