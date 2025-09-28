import React from 'react';

const EquityPieChart = ({ equityBreakdown, size = 40 }) => {
    if (!equityBreakdown || equityBreakdown.totalEquity === 0) {
        return (
            <div
                className="flex items-center justify-center border border-border/40 rounded-full bg-muted/20"
                style={{ width: size, height: size }}
            >
                <span className="text-xs text-muted-foreground">N/A</span>
            </div>
        );
    }

    const { us, exUs } = equityBreakdown;
    const radius = (size - 4) / 2; // Account for border
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke lengths
    const usStrokeLength = (us / 100) * circumference;
    const exUsStrokeLength = (exUs / 100) * circumference;

    // Colors for US vs Ex-US
    const usColor = '#3b82f6'; // Blue for US
    const exUsColor = '#10b981'; // Green for Ex-US

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90" style={{ overflow: 'visible' }}>
                {/* Background circle */}
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="3" />

                {/* US portion */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={usColor}
                    strokeWidth="3"
                    strokeDasharray={`${usStrokeLength} ${circumference}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                />

                {/* Ex-US portion */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={exUsColor}
                    strokeWidth="3"
                    strokeDasharray={`${exUsStrokeLength} ${circumference}`}
                    strokeDashoffset={-usStrokeLength}
                    strokeLinecap="round"
                />
            </svg>

            {/* Center percentage display */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    {us === 100 ? (
                        <div className="text-xs font-medium leading-none text-blue-600">100% US</div>
                    ) : exUs === 100 ? (
                        <div className="text-xs font-medium leading-none text-green-600">100% Ex-US</div>
                    ) : (
                        <>
                            <div className="text-xs font-medium leading-none">{Math.round(us)}%</div>
                            <div className="text-xs text-muted-foreground leading-none">US</div>
                        </>
                    )}
                </div>
            </div>

            {/* Tooltip-like legend - only show if there's both US and Ex-US */}
            {us > 0 && exUs > 0 && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: usColor }}></div>
                        <span className="text-muted-foreground">US</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: exUsColor }}></div>
                        <span className="text-muted-foreground">Ex-US</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquityPieChart;
