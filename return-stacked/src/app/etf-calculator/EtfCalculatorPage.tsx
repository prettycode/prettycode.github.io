import ETFTaxYieldCalculator from '@/features/etf-tax-calculator/components/EtfTaxYieldCalculator';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

export default function ETFCalculatorPage(): React.ReactElement {
    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-card/80 backdrop-blur-md">
                <div className="container mx-auto px-6 py-4">
                    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
                        <Link to="/">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="font-medium">Back to Portfolio Builder</span>
                        </Link>
                    </Button>
                </div>
            </div>
            <ETFTaxYieldCalculator />
        </div>
    );
}
