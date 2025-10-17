import type { Portfolio, SerializedPortfolio } from '@/types/portfolio';

/**
 * Export portfolio as JSON file download
 */
export const exportPortfolio = (portfolio: Portfolio): void => {
    const serializedPortfolio: SerializedPortfolio = {
        name: portfolio.name,
        holdings: Array.from(portfolio.holdings.entries()),
        createdAt: portfolio.createdAt || Date.now(),
    };

    const dataStr = JSON.stringify(serializedPortfolio, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${portfolio.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Import portfolio from JSON file
 */
export const importPortfolio = (file: File): Promise<SerializedPortfolio> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e): void => {
            try {
                const content = e.target?.result as string;
                const portfolio = JSON.parse(content) as SerializedPortfolio;

                // Validate required fields
                if (!portfolio.name || !portfolio.holdings || !Array.isArray(portfolio.holdings)) {
                    reject(new Error('Invalid portfolio file format'));
                    return;
                }

                resolve(portfolio);
            } catch (error) {
                reject(new Error('Failed to parse portfolio file'));
            }
        };

        reader.onerror = (): void => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
};
