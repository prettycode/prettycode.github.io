import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/shared/components/ui/Toast';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Return Stacked Portfolio Builder',
    description:
        'Build and analyze return-stacked ETF portfolios with real-time asset allocation, leverage analysis, and exposure breakdowns.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>): React.ReactElement {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ToastProvider>{children}</ToastProvider>
            </body>
        </html>
    );
}
