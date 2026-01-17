import { BatchStatus } from './batch.model';

export interface BatchFilter {
    itemSearch?: string;
    locationIds?: string[];
    supplierIds?: string[];
    statuses?: BatchStatus[];
    expiryDateRange?: {
        start?: Date;
        end?: Date;
    };
    manufacturingDateRange?: {
        start?: Date;
        end?: Date;
    };
    quantityRange?: {
        min?: number;
        max?: number;
    };
    includeExpired?: boolean;
    includeDepleted?: boolean;
}

export interface BatchFilterForm {
    itemSearch: string;
    locations: string[];
    suppliers: string[];
    statuses: BatchStatus[];
    expiryDateRange: {
        start: Date | null;
        end: Date | null;
    };
    manufacturingDateRange: {
        start: Date | null;
        end: Date | null;
    };
    quantityRange: {
        min: number;
        max: number;
    };
    includeExpired: boolean;
    includeDepleted: boolean;
}

export interface FilterOption {
    value: string;
    label: string;
    count?: number;
}

export interface LocationOption extends FilterOption {
    type: string;
}

export interface SupplierOption extends FilterOption {
    code: string;
}