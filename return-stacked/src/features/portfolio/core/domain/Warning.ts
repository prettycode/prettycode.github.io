/**
 * Warning types for portfolio validation
 */
export interface Warning {
    type: 'error' | 'warning' | 'info';
    message: string;
    description?: string;
}
