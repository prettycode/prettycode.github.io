/**
 * Exposure key utilities - framework-agnostic functions for exposure serialization
 */

import type { Exposure } from '../domain/Exposure';
import type { AssetClass } from '../domain/AssetClass';

/**
 * Creates a unique key for exposure categorization
 */
export const createExposureKey = (exposure: Exposure): string => {
    const marketRegion = exposure.marketRegion ?? '';
    const factorStyle = exposure.factorStyle ?? '';
    const sizeFactor = exposure.sizeFactor ?? '';

    return `${exposure.assetClass}|${marketRegion}|${factorStyle}|${sizeFactor}`;
};

/**
 * Parses exposure key back into structured exposure
 */
export const parseExposureKey = (key: string): Exposure => {
    const [assetClass, marketRegion, factorStyle, sizeFactor] = key.split('|');

    return {
        assetClass: assetClass as AssetClass,
        marketRegion: marketRegion || undefined,
        factorStyle: factorStyle || undefined,
        sizeFactor: sizeFactor || undefined,
    } as Exposure;
};
