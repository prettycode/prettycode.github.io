import type { AssetClass } from '../types';
import { ASSET_CLASS_COLORS, ASSET_CLASS_ORDER } from '../data/colors';
import type { BarSegment } from '../components/StackedBar';
import { labelFor } from './labels';

export function assetClassSegments(byAssetClass: Map<AssetClass, number>): BarSegment[] {
  return ASSET_CLASS_ORDER
    .map(ac => ({ label: labelFor(ac), value: byAssetClass.get(ac) ?? 0, color: ASSET_CLASS_COLORS[ac] }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value);
}
