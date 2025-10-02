import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { roundForDisplay } from '../../utils/precisionUtils';
import { analyzePortfolio, assetClassColors, convertCustomPortfolioToPortfolio } from '../../utils/etfData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CustomPortfolio } from '../../types';

interface ExposureCardProps {
    portfolio?: CustomPortfolio;
    sortByValue?: boolean;
    showRelative?: boolean;
    title?: string;
    data?: Map<string, number> | null;
    dataAbs?: Map<string, number> | null;
    dataRel?: Map<string, number> | null;
    colors?: Record<string, string> | null;
    nameMapping?: Record<string, string> | null;
    showBadge?: boolean;
    hideZeroValues?: boolean;
    collapsible?: boolean;
    defaultExpanded?: boolean;
    isExpanded?: boolean;
    onToggleExpanded?: () => void;
}

const ExposureCard: React.FC<ExposureCardProps> = ({
    portfolio,
    sortByValue = false,
    showRelative = true,
    title = 'Asset Allocation',
    data = null,
    dataAbs = null,
    dataRel = null,
    colors = null,
    nameMapping = null,
    showBadge = true,
    hideZeroValues = false,
    collapsible = false,
    defaultExpanded = true,
    isExpanded,
    onToggleExpanded,
}) => {
    const [localIsExpanded, setLocalIsExpanded] = useState(defaultExpanded);
    const expandedState = isExpanded !== undefined ? isExpanded : localIsExpanded;
    let items: [string, number][];
    let leverage = 1;

    if ((dataAbs && dataRel) || data) {
        const sourceData = dataAbs && dataRel ? (showRelative ? dataRel : dataAbs) : data;
        items = Array.from(sourceData!.entries());
        leverage = 1;
    } else {
        const { assetClasses, totalLeverage } = analyzePortfolio(convertCustomPortfolioToPortfolio(portfolio!));
        items = Array.from(assetClasses.entries());
        leverage = totalLeverage;
    }

    const getDisplayName = (name: string): string => {
        if (nameMapping && nameMapping[name]) {
            return nameMapping[name];
        }

        switch (name) {
            case 'Managed Futures':
                return 'Trend';
            case 'Futures Yield':
                return 'Carry';
            case 'U.S. Treasuries':
                return 'T-Bonds';
            default:
                return name;
        }
    };

    if (sortByValue) {
        items = items.sort((a, b) => b[1] - a[1]);
    }

    if (hideZeroValues) {
        items = items.filter(([, value]) => value > 0);
    }

    const colorMap = colors || assetClassColors;

    const toggleExpanded = (): void => {
        if (onToggleExpanded) {
            onToggleExpanded();
        } else {
            setLocalIsExpanded(!localIsExpanded);
        }
    };

    return (
        <Card className="overflow-hidden border shadow-sm mb-2 py-0 gap-0">
            {collapsible ? (
                <CardHeader
                    className={cn('cursor-pointer py-3 px-4 flex flex-row items-center justify-between')}
                    onClick={toggleExpanded}
                >
                    <div className="flex items-center">
                        <h3 className="font-medium text-sm mr-2">{title}</h3>
                        {showBadge && leverage > 1 && (
                            <Badge
                                className="flex items-center gap-1 font-medium px-2 py-1 text-xs bg-gray-100 text-black border-0 cursor-help"
                                title={`Total Leverage: ${leverage.toFixed(4)}x`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span>{leverage.toFixed(2)}x</span> levered
                            </Badge>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                        {expandedState ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </div>
                </CardHeader>
            ) : (
                <CardContent className="px-4 py-3">
                    <div className="flex items-center">
                        <h3 className="font-medium text-sm mr-2">{title}</h3>
                        {showBadge && leverage > 1 && (
                            <Badge
                                className="flex items-center gap-1 font-medium px-2 py-1 text-xs bg-gray-100 text-black border-0 cursor-help"
                                title={`Total Leverage: ${leverage.toFixed(4)}x`}
                            >
                                <span>{leverage.toFixed(2)}x</span> levered
                            </Badge>
                        )}
                    </div>
                </CardContent>
            )}

            {(!collapsible || expandedState) && (
                <CardContent className={cn('px-4', collapsible ? 'pt-0 pb-3' : 'py-3 pt-0')}>
                    <div className={cn('flex flex-col', collapsible ? 'space-y-0' : 'space-y-2')}>
                        <div>
                            <div className="space-y-1">
                                {items.map(([name, value]) => {
                                    if (hideZeroValues && value === 0) {
                                        return null;
                                    }

                                    const percentage =
                                        (dataAbs && dataRel) || data
                                            ? value
                                            : showRelative
                                              ? roundForDisplay((value / leverage) * 100)
                                              : roundForDisplay(value * 100);

                                    const displayName = getDisplayName(name);

                                    return (
                                        <div key={name} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-shrink-0 w-16 text-left">
                                                    <span className="text-xs font-medium text-foreground">
                                                        {displayName}
                                                    </span>
                                                </div>

                                                <div className="flex-1 relative">
                                                    <div
                                                        className="relative h-6 bg-muted rounded-sm overflow-hidden cursor-pointer"
                                                        title={`${name}: ${
                                                            (dataAbs && dataRel) || data
                                                                ? value.toFixed(4)
                                                                : (value * 100).toFixed(4)
                                                        }% (${showRelative ? 'relative' : 'absolute'})`}
                                                    >
                                                        <div
                                                            className="absolute inset-y-0 left-0 rounded-sm"
                                                            style={{
                                                                width: `${Math.min(percentage, 100)}%`,
                                                                minWidth:
                                                                    percentage > 0 && percentage < 3 ? '2px' : 'auto',
                                                                backgroundColor: colorMap[name],
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex-shrink-0 w-10 text-right">
                                                    <span
                                                        className="text-xs font-medium text-muted-foreground cursor-help"
                                                        title={`${
                                                            (dataAbs && dataRel) || data
                                                                ? value.toFixed(4)
                                                                : showRelative
                                                                  ? ((value / leverage) * 100).toFixed(4)
                                                                  : (value * 100).toFixed(4)
                                                        }%`}
                                                    >
                                                        {(dataAbs && dataRel) || data
                                                            ? value.toFixed(1)
                                                            : percentage.toFixed(1)}
                                                        %
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default ExposureCard;
