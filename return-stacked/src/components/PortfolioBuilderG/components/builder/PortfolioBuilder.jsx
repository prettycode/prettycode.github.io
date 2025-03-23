import React, { useState } from 'react';
import { parseExposureKey, deserializePortfolio } from '../../utils';
import ETFSelector from './ETFSelector';
import PortfolioControls from './PortfolioControls';
import PortfolioTable from './PortfolioTable';
import PortfolioAllocations from './PortfolioAllocations';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Briefcase,
    Plus,
    Trash2,
    Save,
    EyeOff,
    Eye,
    AlertCircle,
    Settings,
    Table,
    BookTemplate,
    Folder,
    ArrowRight,
    CheckCircle,
    Percent,
} from 'lucide-react';

const PortfolioBuilder = ({
    customPortfolio,
    etfCatalog,
    tempInputs,
    showDetailColumns,
    totalAllocation,
    examplePortfolios,
    savedPortfolios,
    onAddETF,
    onRemoveETF,
    onUpdateAllocation,
    onToggleLock,
    onToggleDisable,
    onInputChange,
    onInputBlur,
    onResetPortfolio,
    onSavePortfolio,
    onToggleDetailColumns,
    onDeletePortfolio,
    onUpdatePortfolio,
}) => {
    // State for active tab and new portfolio name
    const [activeTab, setActiveTab] = useState('build');
    const [showPortfolioNameInput, setShowPortfolioNameInput] = useState(false);
    const [portfolioName, setPortfolioName] = useState(customPortfolio.name || '');

    // Function to load a portfolio (example or saved)
    const loadPortfolio = (portfolio, isSaved = false) => {
        try {
            // If it's a saved portfolio, it needs to be deserialized
            const portfolioToLoad = isSaved ? deserializePortfolio(portfolio) : portfolio;

            // Convert the portfolio's holdings to the format used by the builder
            const newHoldings = new Map();

            for (const [ticker, percentage] of portfolioToLoad.holdings.entries()) {
                if (typeof percentage === 'number') {
                    // Simple percentage (used by example portfolios)
                    newHoldings.set(ticker, {
                        percentage,
                        locked: false,
                        disabled: false,
                    });
                } else {
                    // Full holding object (used by saved portfolios)
                    newHoldings.set(ticker, percentage);
                }
            }

            // Update the portfolio with the loaded data
            onUpdatePortfolio({
                name: portfolioToLoad.name,
                description: portfolioToLoad.description || '',
                holdings: newHoldings,
            });

            // Set portfolio name for the input field
            setPortfolioName(portfolioToLoad.name);

            // Switch to the build tab after loading
            setActiveTab('build');
        } catch (error) {
            console.error('Error loading portfolio:', error);
            alert('There was an error loading the portfolio. Please try again.');
        }
    };

    const isPortfolioEmpty = customPortfolio.holdings.size === 0;

    // Handle portfolio save with name
    const handleSaveWithName = () => {
        // Update the portfolio name before saving
        onUpdatePortfolio({
            ...customPortfolio,
            name: portfolioName,
        });

        // Save the portfolio
        onSavePortfolio();

        // Hide the name input field
        setShowPortfolioNameInput(false);
    };

    // Check if portfolio is ready to be saved
    const isPortfolioValid = Math.abs(totalAllocation - 100) <= 0.1 && customPortfolio.holdings.size > 0;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold">Portfolio Builder</h2>
                </div>

                {/* Portfolio name display/edit when in build mode */}
                {activeTab === 'build' && !isPortfolioEmpty && (
                    <div className="flex items-center gap-2">
                        {showPortfolioNameInput ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={portfolioName}
                                    onChange={(e) => setPortfolioName(e.target.value)}
                                    className="px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Portfolio name"
                                />
                                <button
                                    onClick={handleSaveWithName}
                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                                >
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Confirm</span>
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => setShowPortfolioNameInput(true)}
                                className="flex items-center gap-1 px-3 py-1 text-sm rounded-md bg-muted hover:bg-muted/80 cursor-pointer"
                            >
                                <span className="font-medium">{portfolioName || 'Unnamed Portfolio'}</span>
                                <Settings className="h-3 w-3 ml-1 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main tabbed interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="build" className="flex items-center gap-1 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        <span>Build</span>
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="flex items-center gap-1 cursor-pointer">
                        <Folder className="h-4 w-4" />
                        <span>Saved</span>
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="flex items-center gap-1 cursor-pointer">
                        <BookTemplate className="h-4 w-4" />
                        <span>Templates</span>
                    </TabsTrigger>
                </TabsList>

                {/* Templates Tab */}
                <TabsContent value="templates">
                    <Card className="bg-gradient-to-br from-background to-muted/20 border border-border/40 py-0">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-medium mb-4">Start with a Template</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Choose a pre-built portfolio to start with, then customize it to your needs.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {examplePortfolios.map((portfolio) => (
                                    <div
                                        key={portfolio.name}
                                        onClick={() => loadPortfolio(portfolio)}
                                        className="p-4 border border-border/40 rounded-lg hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer group"
                                    >
                                        <h4 className="font-medium mb-2 group-hover:text-primary transition-colors">
                                            {portfolio.name}
                                        </h4>
                                        <p className="text-xs text-muted-foreground mb-3">{portfolio.description}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">
                                                {portfolio.holdings.size} ETFs
                                            </span>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-xs text-primary">
                                                <span>Select</span>
                                                <ArrowRight className="h-3 w-3 ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Build Tab */}
                <TabsContent value="build">
                    <div className="space-y-3">
                        {/* ETF Selection */}
                        <ETFSelector
                            etfCatalog={etfCatalog}
                            onSelect={onAddETF}
                            existingTickers={Array.from(customPortfolio.holdings.keys())}
                        />

                        {/* Portfolio Allocations */}
                        <PortfolioAllocations
                            isPortfolioEmpty={isPortfolioEmpty}
                            setActiveTab={setActiveTab}
                            customPortfolio={customPortfolio}
                            etfCatalog={etfCatalog}
                            tempInputs={tempInputs}
                            showDetailColumns={showDetailColumns}
                            totalAllocation={totalAllocation}
                            isPortfolioValid={isPortfolioValid}
                            portfolioName={portfolioName}
                            onToggleDetailColumns={onToggleDetailColumns}
                            onUpdateAllocation={onUpdateAllocation}
                            onToggleLock={onToggleLock}
                            onToggleDisable={onToggleDisable}
                            onInputChange={onInputChange}
                            onInputBlur={onInputBlur}
                            onRemoveETF={onRemoveETF}
                            onResetPortfolio={onResetPortfolio}
                            onSavePortfolio={onSavePortfolio}
                            setShowPortfolioNameInput={setShowPortfolioNameInput}
                        />
                    </div>
                </TabsContent>

                {/* Saved portfolios Tab */}
                <TabsContent value="saved">
                    <Card className="bg-gradient-to-br from-background to-muted/20 border border-border/40 py-0">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-medium mb-4">Your Saved Portfolios</h3>

                            {savedPortfolios.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <Folder className="h-12 w-12 text-muted-foreground/40 mb-3" />
                                    <h4 className="text-base font-medium mb-2">No Saved Portfolios</h4>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        You haven't saved any portfolios yet. Build a portfolio and save it to see it
                                        here.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('build')}
                                        className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        <span>Create a Portfolio</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {savedPortfolios.map((portfolio) => (
                                        <div
                                            key={portfolio.id}
                                            className="border border-border/40 rounded-lg overflow-hidden group"
                                        >
                                            <div className="p-4">
                                                <h4 className="font-medium mb-1">
                                                    {portfolio.name || 'Unnamed Portfolio'}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    {portfolio.description ||
                                                        `Created on ${new Date(
                                                            portfolio.createdAt
                                                        ).toLocaleDateString()}`}
                                                </p>
                                                <div className="text-xs text-muted-foreground mb-3">
                                                    {portfolio.etfCount || '?'} ETFs
                                                </div>
                                            </div>

                                            <div className="flex border-t border-border/40">
                                                <button
                                                    onClick={() => loadPortfolio(portfolio, true)}
                                                    className="flex-1 py-2 text-xs font-medium text-center hover:bg-muted/50 transition-colors text-foreground cursor-pointer"
                                                >
                                                    Load
                                                </button>
                                                <div className="w-px bg-border/40"></div>
                                                <button
                                                    onClick={() => onDeletePortfolio(portfolio.id)}
                                                    className="flex-1 py-2 text-xs font-medium text-center hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PortfolioBuilder;
