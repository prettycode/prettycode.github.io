import PortfolioManager from '@/features/portfolio/components/PortfolioManager';
import { Link } from 'react-router-dom';
import { Calculator, Info, Layers } from 'lucide-react';

export default function Home(): React.ReactElement {
    return (
        <div className="min-h-screen bg-background pb-10">
            <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
                <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-3.5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                            <Layers className="h-5 w-5" />
                        </span>
                        <div className="leading-tight">
                            <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                                Return Stacked Portfolio Builder
                            </h1>
                            <p className="hidden text-xs text-muted-foreground sm:block">
                                Design leveraged, multi-asset ETF portfolios
                            </p>
                        </div>
                    </div>
                    <nav className="flex items-center gap-2">
                        <Link
                            to="/etf-info"
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <Info className="h-4 w-4" />
                            <span className="hidden sm:inline">ETF Information</span>
                        </Link>
                        <Link
                            to="/etf-calculator"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                        >
                            <Calculator className="h-4 w-4" />
                            <span className="hidden sm:inline">Tax Calculator</span>
                        </Link>
                    </nav>
                </div>
            </header>
            <div className="container mx-auto py-6">
                <PortfolioManager />
            </div>
        </div>
    );
}
