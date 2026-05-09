export interface Holding {
    percentage: number;
    locked?: boolean;
    disabled?: boolean;
    basisPoints?: number;
    displayPercentage?: number;
}

export interface Portfolio {
    name: string;
    holdings: Map<string, Holding>;
    createdAt?: number;
}

export interface SerializedPortfolio {
    name: string;
    holdings: Array<[string, Holding]>;
    createdAt: number;
    etfCount?: number;
}
