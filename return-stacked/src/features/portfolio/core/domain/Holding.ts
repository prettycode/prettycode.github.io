/**
 * Portfolio holding metadata
 */
export interface Holding {
    percentage: number;
    locked?: boolean;
    disabled?: boolean;
    basisPoints?: number;
    displayPercentage?: number;
}
