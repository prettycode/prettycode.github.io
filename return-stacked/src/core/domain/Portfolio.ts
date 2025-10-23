/**
 * Portfolio definition
 */
import type { Holding } from './Holding';

export interface Portfolio {
    name: string;
    holdings: Map<string, Holding>;
    createdAt?: number;
}
