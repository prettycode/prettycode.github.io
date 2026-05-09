import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { assetClassColors } from '@/features/portfolio/core/data/constants/AssetClassColors';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/Card';
import { cn } from '@/shared/lib/Cn';
import type { ColorMap } from '@/features/portfolio/core/domain/Exposure';

interface ExposureCardProps {
    title: string;
    dataAbs: Map<string, number>;
    dataRel: Map<string, number>;
    colors?: ColorMap | null;
    nameMapping?: Record<string, string> | null;
    sortByValue?: boolean;
    showRelative?: boolean;
    hideZeroValues?: boolean;
    collapsible?: boolean;
    defaultExpanded?: boolean;
    isExpanded?: boolean;
    onToggleExpanded?: () => void;
}

const ExposureCard: React.FC<ExposureCardProps> = ({
    title,
    dataAbs,
    dataRel,
    colors = null,
    nameMapping = null,
    sortByValue = false,
    showRelative = true,
    hideZeroValues = false,
    collapsible = false,
    defaultExpanded = true,
    isExpanded,
    onToggleExpanded,
}) => {
    const [localIsExpanded, setLocalIsExpanded] = useState<boolean>(defaultExpanded);
    const expandedState = isExpanded !== undefined ? isExpanded : localIsExpanded;

    const sourceData = showRelative ? dataRel : dataAbs;
    let items = Array.from(sourceData.entries());

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
        items = items.filter(([_, value]) => value > 0);
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
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                        {expandedState ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </div>
                </CardHeader>
            ) : (
                <CardContent className="px-4 py-3">
                    <div className="flex items-center">
                        <h3 className="font-medium text-sm mr-2">{title}</h3>
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
                                                        title={`${name}: ${value.toFixed(4)}% (${showRelative ? 'relative' : 'absolute'})`}
                                                    >
                                                        <div
                                                            className="absolute inset-y-0 left-0 rounded-sm"
                                                            style={{
                                                                width: `${Math.min(value, 100)}%`,
                                                                minWidth: value > 0 && value < 3 ? '2px' : 'auto',
                                                                backgroundColor: colorMap[name],
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex-shrink-0 w-10 text-right">
                                                    <span
                                                        className="text-xs font-medium text-muted-foreground cursor-help"
                                                        title={`${value.toFixed(4)}%`}
                                                    >
                                                        {value.toFixed(1)}%
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
