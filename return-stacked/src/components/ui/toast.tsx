'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(7);
        const toast: Toast = { id, message, type };
        setToasts((prev) => [...prev, toast]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            'pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-top-5 min-w-[300px]',
                            toast.type === 'success' && 'bg-green-50 border-green-200',
                            toast.type === 'error' && 'bg-red-50 border-red-200',
                            toast.type === 'info' && 'bg-blue-50 border-blue-200'
                        )}
                    >
                        {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                        {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                        {toast.type === 'info' && <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                        <span
                            className={cn(
                                'flex-1 text-sm font-medium',
                                toast.type === 'success' && 'text-green-900',
                                toast.type === 'error' && 'text-red-900',
                                toast.type === 'info' && 'text-blue-900'
                            )}
                        >
                            {toast.message}
                        </span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className={cn(
                                'rounded-md p-1 hover:bg-black/10 transition-colors',
                                toast.type === 'success' && 'text-green-600',
                                toast.type === 'error' && 'text-red-600',
                                toast.type === 'info' && 'text-blue-600'
                            )}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
