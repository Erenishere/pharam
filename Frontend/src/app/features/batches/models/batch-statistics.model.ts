export interface BatchStatistics {
    totalBatches: number;
    totalValue: number;
    expiredBatches: number;
    lowStockAlerts: number;
    averageBatchAge: number;
    batchesByStatus: BatchStatusDistribution[];
    batchesByLocation: LocationDistribution[];
    valueBySupplier: SupplierDistribution[];
    expiryAnalytics: ExpiryAnalytics;
    fifoCompliance: FifoComplianceMetrics;
}

export interface BatchStatusDistribution {
    status: string;
    count: number;
    percentage: number;
    value: number;
}

export interface LocationDistribution {
    locationId: string;
    locationName: string;
    batchCount: number;
    totalQuantity: number;
    totalValue: number;
    percentage: number;
}

export interface SupplierDistribution {
    supplierId: string;
    supplierName: string;
    batchCount: number;
    totalValue: number;
    percentage: number;
    averageAge: number;
}

export interface ExpiryAnalytics {
    expiringIn7Days: number;
    expiringIn30Days: number;
    expiringIn90Days: number;
    expiredBatches: number;
    expiryTrend: ExpiryTrendData[];
}

export interface ExpiryTrendData {
    date: string;
    expiringCount: number;
    expiredCount: number;
}

export interface FifoComplianceMetrics {
    overallCompliance: number;
    itemCategories: ItemCategoryCompliance[];
    oldestBatches: OldestBatchInfo[];
}

export interface ItemCategoryCompliance {
    category: string;
    compliancePercentage: number;
    averageAge: number;
    oldestBatchAge: number;
}

export interface OldestBatchInfo {
    batchId: string;
    batchNumber: string;
    itemName: string;
    ageInDays: number;
    quantity: number;
    location: string;
}

export interface StatisticsFilter {
    dateRange?: {
        start: Date;
        end: Date;
    };
    locationIds?: string[];
    supplierIds?: string[];
    itemCategories?: string[];
}

export interface KpiCard {
    title: string;
    value: number | string;
    icon: string;
    color: 'primary' | 'accent' | 'warn' | 'success';
    trend?: {
        direction: 'up' | 'down' | 'neutral';
        percentage: number;
    };
    subtitle?: string;
}

export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

export interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
}