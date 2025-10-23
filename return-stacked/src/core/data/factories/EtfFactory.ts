/**
 * ETF factory - Creates ETF instances with mapped exposures
 */

import type { ETF } from '../../domain/ETF';
import type { ExposureAmount } from '../../domain/ExposureAmount';
import type { LeverageType } from '../../domain/LeverageType';
import { createExposureKey } from '../../utils/ExposureKeys';

/**
 * Creates an ETF with mapped exposures
 */
export const createETF = (ticker: string, exposureData: ExposureAmount[], leverageType: LeverageType = 'None'): ETF => {
    const exposures = new Map<string, number>();

    for (const { exposure, amount } of exposureData) {
        const key = createExposureKey(exposure);
        exposures.set(key, amount);
    }

    return { ticker, exposures, leverageType };
};
