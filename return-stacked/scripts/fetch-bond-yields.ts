#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { ALL_BOND_ETFS, type BondETF } from '../src/constants/etf-data.js';
import type { ETFYieldData } from '../src/types/etf-calculator.js';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

interface BondYieldsData {
    lastUpdated: string;
    etfs: ETFYieldData[];
}

// Use the shared ETF list from the constants file
const ETFS_TO_FETCH = ALL_BOND_ETFS;

async function fetchETFFundamentals(etf: BondETF): Promise<ETFYieldData> {
    const ticker = etf.ticker;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        throw new Error(
            'ALPHA_VANTAGE_API_KEY environment variable is not set. ' +
                'Please create a .env.local file with your Alpha Vantage API key. ' +
                'Get a free API key at: https://www.alphavantage.co/support/#api-key (takes < 20 seconds)'
        );
    }

    try {
        // Use Alpha Vantage ETF_PROFILE function to get ETF fundamental data including dividend yield
        const url = `https://www.alphavantage.co/query?function=ETF_PROFILE&symbol=${ticker}&apikey=${apiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP ${response.status} response body:`, errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();

        if (!data || typeof data !== 'object') {
            throw new Error(`No data returned from API for ${ticker}`);
        }

        // Check for API error messages
        if (data.Information || data.Error || data['Error Message']) {
            const errorMsg = data.Information || data.Error || data['Error Message'];
            throw new Error(`API Error: ${errorMsg}`);
        }

        // Extract ETF name from API response - try multiple possible field names
        // Alpha Vantage's ETF_PROFILE can return the name in different fields
        let name = ticker; // Default to ticker if no name found

        if (data.name && data.name !== 'None' && data.name !== ticker) {
            name = data.name;
        } else if (data.fund_name && data.fund_name !== 'None' && data.fund_name !== ticker) {
            name = data.fund_name;
        } else if (data.etf_name && data.etf_name !== 'None' && data.etf_name !== ticker) {
            name = data.etf_name;
        } else if (data.long_name && data.long_name !== 'None' && data.long_name !== ticker) {
            name = data.long_name;
        } else if (data.fund_family) {
            // If we only have fund_family, we might be able to construct a better name
            console.warn(`⚠️  No full name found for ${ticker}, only have fund_family: ${data.fund_family}`);
        } else {
            console.warn(`⚠️  No name found in API response for ${ticker}, using ticker as fallback`);
        }

        // Alpha Vantage ETF_PROFILE returns dividend_yield as a decimal string (e.g., "0.0325" for 3.25%)
        const dividendYieldStr = data.dividend_yield;

        if (!dividendYieldStr || dividendYieldStr === 'None' || dividendYieldStr === '0' || dividendYieldStr === '0.0000') {
            throw new Error(`No dividend yield data available for ${ticker}`);
        }

        // Convert from decimal to percentage (e.g., "0.0325" -> 3.25)
        const yieldPercent = parseFloat(dividendYieldStr) * 100;

        if (isNaN(yieldPercent)) {
            throw new Error(`Invalid dividend yield data for ${ticker}: ${dividendYieldStr}`);
        }

        // Round to 2 decimal places
        const roundedYield = Math.round(yieldPercent * 100) / 100;

        // Extract expense ratio if available
        const expenseRatioStr = data.expense_ratio || data.management_fee || data.total_expense_ratio;
        let expenseRatio: number = 0;
        if (expenseRatioStr && expenseRatioStr !== 'None' && expenseRatioStr !== '0') {
            const expensePercent = parseFloat(expenseRatioStr);
            if (!isNaN(expensePercent)) {
                // If it's already a percentage (e.g., 0.05), use it; if decimal (0.0005), convert
                expenseRatio = expensePercent < 1 ? expensePercent * 100 : expensePercent;
                expenseRatio = Math.round(expenseRatio * 100) / 100;
            }
        }

        // Extract net assets if available
        let netAssets: string | undefined;
        if (data.net_assets && data.net_assets !== 'None') {
            const assetsNum = parseFloat(data.net_assets);
            if (!isNaN(assetsNum)) {
                netAssets = `$${(assetsNum / 1e9).toFixed(1)}B`;
            }
        }

        console.log(
            `${ticker}: "${name}" - Yield=${roundedYield}%${expenseRatio ? `, Expense=${expenseRatio}%` : ''}${netAssets ? `, AUM=${netAssets}` : ''}`
        );

        return {
            ticker,
            name,
            yield: roundedYield,
            expenseRatio,
            netAssets,
            managementStyle: etf.managementStyle,
            duration: etf.duration,
            fetchedAt: new Date().toISOString(),
            success: true,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch ${ticker}: ${errorMessage}`);
    }
}

async function fetchAllYields(): Promise<void> {
    console.log('📊 Fetching bond fundamental data from Alpha Vantage...\n');

    const publicDir = path.join(process.cwd(), 'public', 'api');
    const filePath = path.join(publicDir, 'bond-yields.json');

    // Create directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    // Load existing data if available
    let existingData: BondYieldsData = { lastUpdated: '', etfs: [] };
    if (fs.existsSync(filePath)) {
        try {
            const fileContents = fs.readFileSync(filePath, 'utf-8');
            existingData = JSON.parse(fileContents);
            console.log(`📂 Loaded existing data with ${existingData.etfs.length} ETFs\n`);
        } catch (error) {
            console.warn('⚠️  Could not load existing data, starting fresh\n');
        }
    }

    const results: ETFYieldData[] = [...existingData.etfs];
    const errors: string[] = [];
    let successCount = 0;

    for (const etf of ETFS_TO_FETCH) {
        console.log(`Fetching ${etf.ticker}...`);

        try {
            const fundamentalData = await fetchETFFundamentals(etf);
            console.log(`✓ ${etf.ticker}: ${fundamentalData.yield}%`);

            // Update or add the ETF data
            const existingIndex = results.findIndex((r) => r.ticker === etf.ticker);
            if (existingIndex >= 0) {
                results[existingIndex] = fundamentalData;
            } else {
                results.push(fundamentalData);
            }

            // Save immediately after each successful fetch
            const bondYieldsData: BondYieldsData = {
                lastUpdated: new Date().toISOString(),
                etfs: results,
            };
            fs.writeFileSync(filePath, JSON.stringify(bondYieldsData, null, 2), 'utf-8');
            console.log(`💾 Saved ${etf.ticker} data to file`);

            successCount++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`✗ ${etf.ticker}: ${errorMessage}`);
            errors.push(`${etf.ticker}: ${errorMessage}`);
        }

        // Add a delay to respect Alpha Vantage's rate limit (5 API calls per minute)
        // Using 13 seconds per call to safely stay under the limit
        await new Promise((resolve) => setTimeout(resolve, 13000));
    }

    console.log(`\n📊 Fetch Summary:`);
    console.log(`✅ Successfully fetched: ${successCount} ETF(s)`);
    console.log(`❌ Failed: ${errors.length} ETF(s)`);
    console.log(`📁 Saved to: ${filePath}`);

    if (errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:`);
        errors.forEach((error) => console.log(`  - ${error}`));
        // Don't throw error - we've saved what we could
    } else {
        console.log(`\n🎉 All ${successCount} bond yields fetched and saved successfully!`);
    }
}

// Run the script
fetchAllYields().catch((error) => {
    console.error('❌ Failed to fetch bond yields:', error);
    process.exit(1);
});
