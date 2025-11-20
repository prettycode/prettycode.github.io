#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { ALL_BOND_ETFS, type BondETF } from '../src/features/etf-tax-calculator/constants/etf-data.js';
import type { ETFYieldData } from '../src/features/etf-tax-calculator/types/etf-calculator.js';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

interface BondYieldsData {
    lastUpdated: string;
    etfs: ETFYieldData[];
}

interface ETFNameMap {
    [ticker: string]: string;
}

// Use the shared ETF list from the constants file
const ETFS_TO_FETCH = ALL_BOND_ETFS;

/**
 * Fetches all ETF names in a single batch request from Alpha Vantage
 * Uses the LISTING_STATUS endpoint which returns all active tickers with their names
 */
async function fetchAllETFNames(): Promise<ETFNameMap> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        throw new Error('ALPHA_VANTAGE_API_KEY environment variable is not set.');
    }

    console.log('📋 Fetching ETF names from Alpha Vantage LISTING_STATUS...\n');

    try {
        // Use LISTING_STATUS endpoint to get all active listings with names
        // This returns a CSV with ticker, name, exchange, assetType, etc.
        const url = `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${apiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();

        // Save the raw response for debugging
        const debugDir = path.join(process.cwd(), 'public', 'api', 'debug');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }
        fs.writeFileSync(path.join(debugDir, 'listing-status.csv'), csvText, 'utf-8');
        console.log('  💾 Saved raw listing status to debug/listing-status.csv');

        // Parse CSV to extract ticker -> name mappings
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const tickerIndex = headers.indexOf('symbol');
        const nameIndex = headers.indexOf('name');

        if (tickerIndex === -1 || nameIndex === -1) {
            throw new Error('Could not find symbol or name columns in CSV response');
        }

        const nameMap: ETFNameMap = {};
        const ourTickers = new Set(ETFS_TO_FETCH.map((etf) => etf.ticker));

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            const ticker = cols[tickerIndex];
            const name = cols[nameIndex];

            // Only store names for the ETFs we care about
            if (ourTickers.has(ticker) && name) {
                nameMap[ticker] = name;
                console.log(`  ✓ ${ticker}: ${name}`);
            }
        }

        console.log(`\n📊 Found ${Object.keys(nameMap).length} of ${ETFS_TO_FETCH.length} ETF names\n`);

        return nameMap;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`⚠️  Failed to fetch ETF names: ${errorMessage}`);
        console.log('⚠️  Will use ticker symbols as fallback names\n');
        return {};
    }
}

async function fetchETFFundamentals(etf: BondETF, name: string): Promise<ETFYieldData> {
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

        // Save raw API response for debugging
        const debugDir = path.join(process.cwd(), 'public', 'api', 'debug');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }
        const debugFilePath = path.join(debugDir, `${ticker}-response.json`);
        fs.writeFileSync(debugFilePath, JSON.stringify(data, null, 2), 'utf-8');

        if (!data || typeof data !== 'object') {
            throw new Error(`No data returned from API for ${ticker}`);
        }

        // Check for API error messages
        if (data.Information || data.Error || data['Error Message']) {
            const errorMsg = data.Information || data.Error || data['Error Message'];
            throw new Error(`API Error: ${errorMsg}`);
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

    // First, fetch all ETF names in a single batch request
    const nameMap = await fetchAllETFNames();

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
            const name = nameMap[etf.ticker] || etf.ticker;
            const fundamentalData = await fetchETFFundamentals(etf, name);
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
