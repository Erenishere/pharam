export interface InvoiceItem {
  itemId: string;
  itemName?: string;
  itemCode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  lineTotal: number;
  batchInfo?: {
    batchNumber: string;
    expiryDate: string;
    manufacturingDate?: string;
  };
  boxQuantity?: number;
  unitQuantity?: number;
  boxRate?: number;
  unitRate?: number;
  gstRate?: number;
  gstAmount?: number;
  warehouseId?: string;
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  gst18Total?: number;
  gst4Total?: number;
  advanceTaxTotal?: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  type: 'sales' | 'purchase' | 'return_sales' | 'return_purchase';
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  status: 'draft' | 'confirmed' | 'paid' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
  notes?: string;
  supplierBillNo?: string;
  previousBalance?: number;
  totalBalance?: number;
  creditLimitExceeded?: boolean;
  salesmanId?: string;
  warehouseId?: string;
  printFormat?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  supplierId?: string;
  customerId?: string;
}

export interface InvoiceStatistics {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  draftCount: number;
  confirmedCount: number;
  paidCount: number;
  cancelledCount: number;
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
