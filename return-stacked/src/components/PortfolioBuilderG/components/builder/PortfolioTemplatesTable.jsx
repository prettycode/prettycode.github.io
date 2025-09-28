import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Target, Layers, MousePointer2 } from 'lucide-react';
import { getTemplateDetails } from '../../utils/etfData';
import EquityPieChart from './EquityPieChart';
import CompactAssetAllocationBar from './CompactAssetAllocationBar';

const PortfolioTemplatesTable = ({ examplePortfolios, onSelectTemplate }) => {
    // Process all templates to get detailed information
    const templateDetails = useMemo(() => {
        return examplePortfolios.map((portfolio) => getTemplateDetails(portfolio));
    }, [examplePortfolios]);

    const formatLeverage = (leverage) => {
        return `${leverage.toFixed(2)}x`;
    };

    const getLeverageColor = (leverage) => {
        if (leverage <= 1.2) return 'bg-green-100 text-green-800 border-green-200';
        if (leverage <= 1.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    return (
        <div className="w-full overflow-hidden border border-border/40 rounded-lg">
            <div className="px-4 py-3 bg-muted/20 border-b border-border/20">
                <p className="text-sm text-muted-foreground flex items-center space-x-2">
                    <MousePointer2 className="h-4 w-4" />
                    <span>Click any row to select and apply that template to your portfolio</span>
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-muted/30 border-b border-border/40">
                            <th className="text-left p-4 font-medium text-sm">Template Name</th>
                            <th className="text-center p-4 font-medium text-sm">Leverage</th>
                            <th className="text-left p-4 font-medium text-sm">Asset Allocation</th>
                            <th className="text-left p-4 font-medium text-sm">Leverage Types</th>
                            <th className="text-center p-4 font-medium text-sm">Equity Split</th>
                            <th className="text-left p-4 font-medium text-sm">ETF Composition</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templateDetails.map((template, index) => (
                            <tr
                                key={template.name}
                                onClick={() => onSelectTemplate(examplePortfolios[index])}
                                className="border-b border-border/20 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group relative"
                            >
                                {/* Template Name */}
                                <td className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Target className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                                            <div>
                                                <div className="font-medium text-sm group-hover:text-primary transition-colors">
                                                    {template.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">
                                                    Click to select template
                                                </div>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 text-primary">
                                            <MousePointer2 className="h-3 w-3" />
                                            <span className="text-xs font-medium">Select</span>
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
                                    </div>
                                </td>

                                {/* ETF Count 
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                        <Layers className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm font-medium">{template.etfCount}</span>
                                    </div>
                                </td>
                                */}

                                {/* Leverage */}
                                <td className="p-4 text-center">
                                    <Badge
                                        variant="outline"
                                        className={`${getLeverageColor(
                                            template.totalLeverage
                                        )} border text-xs group-hover:shadow-sm transition-shadow`}
                                    >
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        {formatLeverage(template.totalLeverage)}
                                    </Badge>
                                </td>

                                {/* Asset Allocation */}
                                <td className="p-4">
                                    <div className="w-32 group-hover:transform group-hover:scale-105 transition-transform">
                                        <CompactAssetAllocationBar portfolio={examplePortfolios[index]} height={20} />
                                    </div>
                                </td>

                                {/* Leverage Types */}
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1 max-w-32">
                                        {template.leverageTypesWithAmounts.size > 0 ? (
                                            Array.from(template.leverageTypesWithAmounts.entries()).map(
                                                ([leverageType, amount]) => (
                                                    <Badge
                                                        key={leverageType}
                                                        variant="secondary"
                                                        className="text-xs group-hover:shadow-sm transition-shadow"
                                                    >
                                                        {leverageType === 'Daily Reset'
                                                            ? `${leverageType} ${amount}x`
                                                            : leverageType}
                                                    </Badge>
                                                )
                                            )
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-xs group-hover:shadow-sm transition-shadow"
                                            >
                                                Unleveraged
                                            </Badge>
                                        )}
                                    </div>
                                </td>

                                {/* Equity Split Pie Chart */}
                                <td className="p-4">
                                    <div className="flex justify-center group-hover:transform group-hover:scale-110 transition-transform">
                                        <EquityPieChart equityBreakdown={template.equityBreakdown} size={50} />
                                    </div>
                                </td>

                                {/* ETF Composition */}
                                <td className="p-4">
                                    <div className="text-xs space-y-1 max-w-48 group-hover:text-primary/80 transition-colors">
                                        {template.etfDetails
                                            .sort((a, b) => b.percentage - a.percentage)
                                            .slice(0, 3)
                                            .map((etf) => (
                                                <div key={etf.ticker} className="flex justify-between items-center">
                                                    <span className="font-mono font-medium">{etf.ticker}</span>
                                                    <span className="text-muted-foreground group-hover:text-primary/60 transition-colors">
                                                        {etf.percentage}%
                                                    </span>
                                                </div>
                                            ))}
                                        {template.etfDetails.length > 3 && (
                                            <div className="text-muted-foreground text-center group-hover:text-primary/60 transition-colors">
                                                +{template.etfDetails.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PortfolioTemplatesTable;
