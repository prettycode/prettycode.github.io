import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/globals.css';
import { ToastProvider } from '@/shared/components/ui/Toast';
import Home from './app/Home';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

createRoot(rootElement).render(
    <StrictMode>
        <ToastProvider>
            <Home />
        </ToastProvider>
    </StrictMode>
);
