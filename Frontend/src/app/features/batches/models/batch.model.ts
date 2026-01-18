export interface Batch {
    _id: string;
    itemId: string;
    item?: Item;
    batchNumber: string;
    quantity: number;
    remainingQuantity: number;
    unitCost: number;
    manufacturingDate: Date;
    expiryDate: Date;
    locationId: string;
    location?: Location;
    supplierId?: string;
    supplier?: Supplier;
    status: BatchStatus;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}

export enum BatchStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    DEPLETED = 'depleted',
    QUARANTINED = 'quarantined'
}

export interface Item {
    _id: string;
    code: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
}

export interface Location {
    _id: string;
    name: string;
    code: string;
    type: string;
}

export interface Supplier {
    _id: string;
    name: string;
    code: string;
    contactInfo?: {
        email?: string;
        phone?: string;
    };
}

export interface CreateBatchRequest {
    itemId: string;
    batchNumber?: string;
    quantity: number;
    unitCost: number;
    manufacturingDate: Date;
    expiryDate: Date;
    locationId: string;
    supplierId?: string;
    notes?: string;
}

export interface UpdateBatchRequest {
    itemId?: string;
    quantity?: number;
    unitCost?: number;
    manufacturingDate?: Date;
    expiryDate?: Date;
    locationId?: string;
    supplierId?: string;
    notes?: string;
}

export interface QuantityAdjustment {
    adjustmentAmount: number;
    reason: string;
    notes?: string;
}

export interface BatchResponse {
    success: boolean;
    data: Batch[];
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        pageSize: number;
    };
    message?: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}