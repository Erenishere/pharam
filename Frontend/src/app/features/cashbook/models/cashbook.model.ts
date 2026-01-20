export interface CashReceipt {
  _id: string;
  receiptNumber: string;
  receiptDate: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'online';
  status: 'pending' | 'cleared' | 'cancelled';
  chequeStatus?: 'pending' | 'cleared' | 'bounced';
  postDatedCheque?: boolean;
  bankDetails?: {
    bankName: string;
    chequeNumber: string;
    chequeDate: string;
    accountNumber?: string;
  };
  allocations?: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
  }[];
  notes?: string;
  salesmanId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashPayment {
  _id: string;
  paymentNumber: string;
  paymentDate: string;
  supplierId: string;
  supplierName?: string;
  amount: number;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'online';
  status: 'pending' | 'cleared' | 'cancelled';
  bankDetails?: {
    bankName: string;
    chequeNumber: string;
    accountNumber?: string;
  };
  allocations?: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
  }[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashBookSummary {
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  receiptCount: number;
  paymentCount: number;
}

export interface CashBookStatistics {
  todayReceipts: number;
  todayPayments: number;
  pendingCheques: number;
  pendingChequeAmount: number;
  monthlyReceipts: number;
  monthlyPayments: number;
}

export interface CashBookQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentMethod?: string;
  customerId?: string;
  supplierId?: string;
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
