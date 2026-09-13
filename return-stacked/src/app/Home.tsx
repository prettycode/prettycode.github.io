import PortfolioManager from '@/features/portfolio/components/PortfolioManager';
import { Layers } from 'lucide-react';

export default function Home(): React.ReactElement {
    return (
        <div className="min-h-screen bg-background pb-10">
            <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
                <div className="container mx-auto flex items-center gap-4 px-6 py-3.5">
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
                </div>
            </header>
            <div className="container mx-auto py-6">
                <PortfolioManager />
            </div>
        </div>
    );
}
