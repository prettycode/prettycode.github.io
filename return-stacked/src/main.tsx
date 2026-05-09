import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './app/globals.css';
import { ToastProvider } from '@/shared/components/ui/Toast';
import Home from './app/page';
import ETFCalculatorPage from './app/etf-calculator/page';
import ETFInfoPage from './app/etf-info/page';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

createRoot(rootElement).render(
    <StrictMode>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <ToastProvider>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/etf-info" element={<ETFInfoPage />} />
                    <Route path="/etf-calculator" element={<ETFCalculatorPage />} />
                </Routes>
            </ToastProvider>
        </BrowserRouter>
    </StrictMode>,
);
