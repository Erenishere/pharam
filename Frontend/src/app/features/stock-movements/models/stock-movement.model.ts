export interface StockMovement {
  _id: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  movementType: 'in' | 'out' | 'adjustment' | 'transfer';
  referenceType: 'purchase' | 'sale' | 'return' | 'adjustment' | 'transfer' | 'correction';
  referenceId?: string;
  referenceNumber?: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  warehouseId?: string;
  warehouseName?: string;
  batchNumber?: string;
  reason?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface StockMovementStatistics {
  totalIn: number;
  totalOut: number;
  totalAdjustments: number;
  netChange: number;
  movementCount: number;
}

export interface LowStockItem {
  _id: string;
  code: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  averageDailyUsage: number;
  daysUntilStockout: number;
}

export interface StockMovementQueryParams {
  page?: number;
  limit?: number;
  itemId?: string;
  movementType?: string;
  referenceType?: string;
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}
