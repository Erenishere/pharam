/**
 * Invoice Detail Component
 * 
 * This component displays comprehensive invoice information with tabbed interface
 * for Details, Items, History, and Stock Movements. It includes action buttons
 * for status management, payment tracking, and print/export functionality.
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { takeUntil, switchMap, tap } from 'rxjs/operators';

import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PaymentDialogComponent } from '../payment-dialog/payment-dialog.component';
import { StatusDialogComponent } from '../status-dialog/status-dialog.component';

import {
    SalesInvoice,
    InvoiceStatus,
    PaymentStatus,
    InvoiceHistory,
    StockMovement,
    PaymentRecord,
    WarrantyInfo,
    AuditTrailEntry,
    RelatedDocument
} from '../../models';

@Component({
    selector: 'app-invoice-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatTableModule,
        MatChipsModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatMenuModule,
        MatDividerModule,
        MatBadgeModule,
        MatDialogModule
    ],
    templateUrl: './invoice-detail.component.html',
    styleUrl: './invoice-detail.component.scss'
})
export class InvoiceDetailComponent implements OnInit, OnDestroy {
    @Input() invoiceId?: string;

    invoice$ = new BehaviorSubject<SalesInvoice | null>(null);
    loading = false;
    actionLoading = false;

    // Tab data
    stockMovements: StockMovement[] = [];
    warrantyInfo: WarrantyInfo[] = [];
    auditTrail: AuditTrailEntry[] = [];
    relatedDocuments: RelatedDocument[] = [];

    // Permissions
    canEdit = false;
    canConfirm = false;
    canCancel = false;
    canManagePayments = false;
    canPrint = false;
    canExport = false;

    // Enums for template
    InvoiceStatus = InvoiceStatus;
    PaymentStatus = PaymentStatus;

    // Table columns
    itemColumns = ['item', 'quantity', 'unitPrice', 'discount', 'taxAmount', 'totalAmount'];
    historyColumns = ['date', 'action', 'user', 'details'];
    stockMovementColumns = ['item', 'quantity', 'warehouse', 'batch', 'date'];
    paymentColumns = ['date', 'amount', 'method', 'reference', 'user'];
    auditColumns = ['timestamp', 'event', 'user', 'changes', 'impact'];
    relatedDocColumns = ['type', 'reference', 'date', 'status', 'actions'];

    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private salesInvoiceService: SalesInvoiceService,
        private toastService: ToastService,
        private authService: AuthService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.checkPermissions();
        this.loadInvoiceData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Check user permissions for various actions
     */
    private checkPermissions(): void {
        const user = this.authService.getCurrentUser();
        const role = user?.role;

        switch (role) {
            case 'admin':
                this.canEdit = this.canConfirm = this.canCancel =
                    this.canManagePayments = this.canPrint = this.canExport = true;
                break;
            case 'sales':
                this.canEdit = this.canConfirm = this.canManagePayments =
                    this.canPrint = this.canExport = true;
                break;
            case 'data_entry':
                this.canEdit = this.canPrint = true;
                break;
            default:
                this.canPrint = this.canExport = true; // Read-only access
                break;
        }
    }

    /**
     * Load invoice data from route resolver or service
     */
    private loadInvoiceData(): void {
        // First try to get invoice from route resolver
        const resolvedInvoice = this.route.snapshot.data['invoice'];
        if (resolvedInvoice) {
            this.invoice$.next(resolvedInvoice);
            this.loadAdditionalData(resolvedInvoice._id);
            return;
        }

        // If no resolved data, get invoice ID from route or input
        const invoiceId = this.invoiceId || this.route.snapshot.paramMap.get('id');
        if (!invoiceId) {
            this.toastService.error('Invoice ID not provided');
            this.router.navigate(['/sales-invoices']);
            return;
        }

        this.loading = true;
        this.salesInvoiceService.getInvoiceById(invoiceId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.invoice$.next(response.data);
                        this.loadAdditionalData(response.data._id);
                    } else {
                        this.toastService.error('Failed to load invoice details');
                    }
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error loading invoice:', error);
                    this.toastService.error(error.userMessage || 'Failed to load invoice details');
                    this.loading = false;
                }
            });
    }

    /**
     * Load additional data for tabs (stock movements, warranty info, audit trail)
     */
    private loadAdditionalData(invoiceId: string): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        // Load stock movements if invoice is confirmed
        if (invoice.status === InvoiceStatus.CONFIRMED) {
            this.stockMovements = invoice.stockMovements || [];
        }

        // Load warranty information for applicable items
        this.loadWarrantyInfo(invoice);

        // Build comprehensive audit trail
        this.buildAuditTrail(invoice);

        // Load related documents
        this.loadRelatedDocuments(invoiceId);
    }

    /**
     * Load warranty information for invoice items
     */
    private loadWarrantyInfo(invoice: SalesInvoice): void {
        // Mock warranty data - replace with actual service call
        this.warrantyInfo = invoice.items
            .filter(item => this.itemHasWarranty(item.item))
            .map(item => ({
                itemId: item.itemId,
                item: item.item,
                warrantyPeriod: 12, // months
                warrantyStartDate: new Date(invoice.invoiceDate),
                warrantyEndDate: new Date(new Date(invoice.invoiceDate).setMonth(new Date(invoice.invoiceDate).getMonth() + 12)),
                warrantyTerms: 'Standard manufacturer warranty',
                isActive: true
            }));
    }

    /**
     * Build comprehensive audit trail from invoice history and payment records
     */
    private buildAuditTrail(invoice: SalesInvoice): void {
        this.auditTrail = [];

        // Add invoice creation entry
        this.auditTrail.push({
            _id: 'creation',
            timestamp: new Date(invoice.createdAt),
            event: 'Invoice Created',
            eventType: 'creation',
            user: invoice.createdBy,
            changes: {
                status: { from: null, to: InvoiceStatus.DRAFT },
                customer: invoice.customer?.name,
                amount: invoice.totals.grandTotal
            },
            impact: 'Invoice created in draft status',
            metadata: {
                invoiceNumber: invoice.invoiceNumber,
                customerName: invoice.customer?.name,
                totalAmount: invoice.totals.grandTotal
            }
        });

        // Add status change history
        if (invoice.history && invoice.history.length > 0) {
            invoice.history.forEach(historyEntry => {
                this.auditTrail.push({
                    _id: historyEntry._id,
                    timestamp: new Date(historyEntry.performedAt),
                    event: this.getEventDisplayName(historyEntry.action),
                    eventType: 'status_change',
                    user: historyEntry.performedBy,
                    changes: {
                        status: {
                            from: historyEntry.previousStatus || null,
                            to: historyEntry.newStatus || InvoiceStatus.DRAFT
                        }
                    },
                    impact: this.getStatusChangeImpact(historyEntry.action, historyEntry.newStatus),
                    reason: historyEntry.reason,
                    metadata: historyEntry.details
                });
            });
        }

        // Add payment history
        if (invoice.payment.paymentHistory && invoice.payment.paymentHistory.length > 0) {
            invoice.payment.paymentHistory.forEach(payment => {
                this.auditTrail.push({
                    _id: payment._id,
                    timestamp: new Date(payment.paymentDate),
                    event: 'Payment Recorded',
                    eventType: 'payment',
                    user: payment.createdBy,
                    changes: {
                        payment: {
                            amount: payment.amount,
                            method: payment.paymentMethod,
                            reference: payment.reference
                        }
                    },
                    impact: `Payment of ${this.formatCurrency(payment.amount)} recorded. Remaining: ${this.formatCurrency(invoice.payment.remainingAmount)}`,
                    metadata: {
                        paymentMethod: payment.paymentMethod,
                        reference: payment.reference,
                        notes: payment.notes
                    }
                });
            });
        }

        // Add stock movement entries for confirmed invoices
        if (invoice.status === InvoiceStatus.CONFIRMED && this.stockMovements.length > 0) {
            this.stockMovements.forEach(movement => {
                this.auditTrail.push({
                    _id: movement._id,
                    timestamp: new Date(movement.createdAt),
                    event: 'Stock Movement',
                    eventType: 'stock_movement',
                    user: 'System', // Stock movements are typically system-generated
                    changes: {
                        stock: {
                            item: movement.item?.name || 'Unknown Item',
                            quantity: movement.quantity,
                            warehouse: movement.warehouse?.name || 'Unknown Warehouse',
                            batch: movement.batchInfo?.batchNumber
                        }
                    },
                    impact: `Stock reduced by ${movement.quantity} ${movement.item?.unit} for ${movement.item?.name}`,
                    metadata: {
                        itemCode: movement.item?.code,
                        warehouseName: movement.warehouse?.name,
                        batchInfo: movement.batchInfo
                    }
                });
            });
        }

        // Sort audit trail by timestamp (most recent first)
        this.auditTrail.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    /**
     * Get display name for audit events
     */
    private getEventDisplayName(action: string): string {
        const eventNames: { [key: string]: string } = {
            'create': 'Invoice Created',
            'confirm': 'Invoice Confirmed',
            'cancel': 'Invoice Cancelled',
            'edit': 'Invoice Modified',
            'payment': 'Payment Recorded',
            'partial_payment': 'Partial Payment Recorded',
            'mark_paid': 'Marked as Paid',
            'send_sms': 'SMS Notification Sent',
            'print': 'Invoice Printed',
            'export': 'Invoice Exported'
        };
        return eventNames[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get impact description for status changes
     */
    private getStatusChangeImpact(action: string, newStatus?: InvoiceStatus): string {
        switch (action) {
            case 'confirm':
                return 'Invoice confirmed. Stock movements generated and customer balance updated.';
            case 'cancel':
                return 'Invoice cancelled. No stock impact or customer balance changes.';
            case 'edit':
                return 'Invoice details modified. Calculations updated automatically.';
            default:
                return `Invoice status changed to ${newStatus?.replace('_', ' ') || 'unknown'}.`;
        }
    }

    /**
     * Load related documents for the invoice
     */
    private loadRelatedDocuments(invoiceId: string): void {
        // This would typically make an API call to get related documents
        // For now, we'll create mock data based on invoice status and history
        this.relatedDocuments = [];

        const invoice = this.invoice$.value;
        if (!invoice) return;

        // Add estimate if invoice was converted from estimate
        if (invoice.metadata?.convertedFromEstimate &&
            invoice.metadata.estimateId &&
            invoice.metadata.estimateNumber &&
            invoice.metadata.estimateDate) {
            this.relatedDocuments.push({
                _id: 'estimate-' + invoice.metadata.estimateId,
                type: 'Estimate',
                reference: invoice.metadata.estimateNumber,
                date: new Date(invoice.metadata.estimateDate),
                status: 'converted',
                description: 'Original estimate that was converted to this invoice',
                url: `/estimates/${invoice.metadata.estimateId}`,
                canView: true,
                canDownload: true
            });
        }

        // Add delivery note for confirmed invoices
        if (invoice.status === InvoiceStatus.CONFIRMED) {
            this.relatedDocuments.push({
                _id: 'delivery-note-' + invoiceId,
                type: 'Delivery Note',
                reference: `DN-${invoice.invoiceNumber}`,
                date: new Date(invoice.updatedAt),
                status: 'generated',
                description: 'Delivery note generated when invoice was confirmed',
                url: `/delivery-notes/${invoiceId}`,
                canView: true,
                canDownload: true
            });
        }

        // Add payment receipts for paid invoices
        if (invoice.payment.paymentHistory && invoice.payment.paymentHistory.length > 0) {
            invoice.payment.paymentHistory.forEach((payment, index) => {
                this.relatedDocuments.push({
                    _id: 'receipt-' + payment._id,
                    type: 'Payment Receipt',
                    reference: `PR-${invoice.invoiceNumber}-${index + 1}`,
                    date: new Date(payment.paymentDate),
                    status: 'issued',
                    description: `Payment receipt for ${this.formatCurrency(payment.amount)} via ${payment.paymentMethod}`,
                    url: `/payment-receipts/${payment._id}`,
                    canView: true,
                    canDownload: true
                });
            });
        }

        // Add return notes if any returns exist
        // This would typically come from the API
        // For now, we'll add a placeholder if invoice is old enough
        const invoiceAge = Date.now() - new Date(invoice.invoiceDate).getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        if (invoiceAge > thirtyDaysInMs && invoice.status === InvoiceStatus.CONFIRMED) {
            // Mock: Add potential return note
            this.relatedDocuments.push({
                _id: 'return-note-' + invoiceId,
                type: 'Return Note',
                reference: `RN-${invoice.invoiceNumber}`,
                date: new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)), // 15 days ago
                status: 'pending',
                description: 'Return request for damaged items',
                url: `/return-notes/${invoiceId}`,
                canView: true,
                canDownload: false
            });
        }

        // Sort by date (most recent first)
        this.relatedDocuments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    /**
     * Get status chip color
     */
    getStatusColor(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.DRAFT: return 'accent';
            case InvoiceStatus.CONFIRMED: return 'primary';
            case InvoiceStatus.CANCELLED: return 'warn';
            default: return '';
        }
    }

    /**
     * Get payment status chip color
     */
    getPaymentStatusColor(status: PaymentStatus): string {
        switch (status) {
            case PaymentStatus.PENDING: return 'warn';
            case PaymentStatus.PARTIAL: return 'accent';
            case PaymentStatus.PAID: return 'primary';
            default: return '';
        }
    }

    /**
     * Check if invoice can be edited
     */
    canEditInvoice(): boolean {
        const invoice = this.invoice$.value;
        return this.canEdit && invoice?.status === InvoiceStatus.DRAFT;
    }

    /**
     * Check if invoice can be confirmed
     */
    canConfirmInvoice(): boolean {
        const invoice = this.invoice$.value;
        return this.canConfirm && invoice?.status === InvoiceStatus.DRAFT;
    }

    /**
     * Check if invoice can be cancelled
     */
    canCancelInvoice(): boolean {
        const invoice = this.invoice$.value;
        return this.canCancel && (invoice?.status === InvoiceStatus.DRAFT || invoice?.status === InvoiceStatus.CONFIRMED);
    }

    /**
     * Check if payments can be managed
     */
    canManageInvoicePayments(): boolean {
        const invoice = this.invoice$.value;
        return this.canManagePayments &&
            invoice?.status === InvoiceStatus.CONFIRMED &&
            invoice?.payment.paymentStatus !== PaymentStatus.PAID;
    }

    /**
     * Navigate to edit invoice
     */
    editInvoice(): void {
        const invoice = this.invoice$.value;
        if (invoice) {
            this.router.navigate(['/sales-invoices/edit', invoice._id]);
        }
    }

    /**
     * Confirm invoice
     */
    confirmInvoice(): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        const dialogRef = this.dialog.open(StatusDialogComponent, {
            width: '500px',
            data: {
                action: 'confirm',
                invoice: invoice,
                title: 'Confirm Invoice',
                message: 'Are you sure you want to confirm this invoice? This action cannot be undone.',
                confirmText: 'Confirm Invoice'
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.performStatusChange('confirm', result);
            }
        });
    }

    /**
     * Cancel invoice
     */
    cancelInvoice(): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        const dialogRef = this.dialog.open(StatusDialogComponent, {
            width: '500px',
            data: {
                action: 'cancel',
                invoice: invoice,
                title: 'Cancel Invoice',
                message: 'Are you sure you want to cancel this invoice? This action cannot be undone.',
                confirmText: 'Cancel Invoice',
                requireReason: true
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.performStatusChange('cancel', result);
            }
        });
    }

    /**
     * Perform status change operation
     */
    private performStatusChange(action: 'confirm' | 'cancel', data: any): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        this.actionLoading = true;
        const request = { reason: data.reason, notes: data.notes };

        const operation = action === 'confirm'
            ? this.salesInvoiceService.confirmInvoice(invoice._id, request)
            : this.salesInvoiceService.cancelInvoice(invoice._id, request);

        operation.pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.invoice$.next(response.data);
                        this.toastService.success(`Invoice ${action}ed successfully`);

                        // Reload additional data if confirmed
                        if (action === 'confirm') {
                            this.loadAdditionalData(response.data._id);
                        }
                    } else {
                        this.toastService.error(`Failed to ${action} invoice`);
                    }
                    this.actionLoading = false;
                },
                error: (error) => {
                    console.error(`Error ${action}ing invoice:`, error);
                    this.toastService.error(error.userMessage || `Failed to ${action} invoice`);
                    this.actionLoading = false;
                }
            });
    }

    /**
     * Open payment dialog
     */
    managePayment(): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        const dialogRef = this.dialog.open(PaymentDialogComponent, {
            width: '600px',
            data: {
                invoice: invoice,
                mode: 'record'
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.recordPayment(result);
            }
        });
    }

    /**
     * Record payment
     */
    private recordPayment(paymentData: any): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        this.actionLoading = true;

        const operation = paymentData.amount >= invoice.payment.remainingAmount
            ? this.salesInvoiceService.markAsPaid(invoice._id, paymentData)
            : this.salesInvoiceService.markAsPartialPaid(invoice._id, paymentData);

        operation.pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.invoice$.next(response.data);
                        this.toastService.success('Payment recorded successfully');
                    } else {
                        this.toastService.error('Failed to record payment');
                    }
                    this.actionLoading = false;
                },
                error: (error) => {
                    console.error('Error recording payment:', error);
                    this.toastService.error(error.userMessage || 'Failed to record payment');
                    this.actionLoading = false;
                }
            });
    }

    /**
     * Print invoice
     */
    printInvoice(): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        this.actionLoading = true;
        this.salesInvoiceService.printInvoice(invoice._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const printWindow = window.open(url, '_blank');
                    if (printWindow) {
                        printWindow.onload = () => {
                            printWindow.print();
                            window.URL.revokeObjectURL(url);
                        };
                    }
                    this.actionLoading = false;
                },
                error: (error) => {
                    console.error('Error printing invoice:', error);
                    this.toastService.error('Failed to print invoice');
                    this.actionLoading = false;
                }
            });
    }

    /**
     * Export invoice as PDF
     */
    exportInvoicePDF(): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        this.actionLoading = true;
        this.salesInvoiceService.getInvoicePDF(invoice._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    this.toastService.success('Invoice exported successfully');
                    this.actionLoading = false;
                },
                error: (error) => {
                    console.error('Error exporting invoice:', error);
                    this.toastService.error('Failed to export invoice');
                    this.actionLoading = false;
                }
            });
    }

    /**
     * Send SMS notification
     */
    sendSMSNotification(): void {
        const invoice = this.invoice$.value;
        if (!invoice || !invoice.customer) return;

        this.actionLoading = true;
        const smsRequest = {
            invoiceId: invoice._id,
            phoneNumber: (invoice.customer as any).phone,
            message: `Invoice ${invoice.invoiceNumber} for ${invoice.totals.grandTotal} is ready. Thank you for your business.`
        };

        this.salesInvoiceService.sendSMSNotification(smsRequest)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success('SMS notification sent successfully');
                    } else {
                        this.toastService.error('Failed to send SMS notification');
                    }
                    this.actionLoading = false;
                },
                error: (error) => {
                    console.error('Error sending SMS:', error);
                    this.toastService.error('Failed to send SMS notification');
                    this.actionLoading = false;
                }
            });
    }

    /**
     * View related documents
     */
    viewRelatedDocuments(): void {
        const invoice = this.invoice$.value;
        if (!invoice) return;

        // This would typically open a dialog or navigate to a related documents page
        // For now, we'll show a toast message indicating the feature
        this.toastService.info('Related documents feature will be implemented in a future update');

        // TODO: Implement related documents functionality
        // This could include:
        // - Purchase orders that led to this invoice
        // - Delivery notes
        // - Payment receipts
        // - Return notes
        // - Warranty documents
    }

    /**
     * Navigate back to invoice list
     */
    goBack(): void {
        this.router.navigate(['/sales-invoices']);
    }

    /**
     * Refresh invoice data
     */
    refreshData(): void {
        const invoice = this.invoice$.value;
        if (invoice) {
            this.loading = true;
            this.salesInvoiceService.getInvoiceById(invoice._id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (response) => {
                        if (response.success) {
                            this.invoice$.next(response.data);
                            this.loadAdditionalData(response.data._id);
                            this.toastService.success('Data refreshed successfully');
                        }
                        this.loading = false;
                    },
                    error: (error) => {
                        console.error('Error refreshing data:', error);
                        this.toastService.error('Failed to refresh data');
                        this.loading = false;
                    }
                });
        }
    }

    /**
     * Get formatted currency value
     */
    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR'
        }).format(amount);
    }

    /**
     * Get formatted date
     */
    formatDate(date: Date | string): string {
        return new Date(date).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Get formatted date and time
     */
    formatDateTime(date: Date | string): string {
        return new Date(date).toLocaleString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * View warranty details
     */
    viewWarrantyDetails(warranty: WarrantyInfo): void {
        // This would typically open a dialog with detailed warranty information
        this.toastService.info(`Warranty details for ${warranty.item?.name} - ${warranty.warrantyPeriod} months coverage`);

        // TODO: Implement warranty details dialog
        // This could include:
        // - Full warranty terms and conditions
        // - Claim history
        // - Service center information
        // - Coverage details
    }

    /**
     * Create warranty claim
     */
    createWarrantyClaim(warranty: WarrantyInfo): void {
        // This would typically open a dialog or navigate to warranty claim creation
        this.toastService.info(`Creating warranty claim for ${warranty.item?.name}`);

        // TODO: Implement warranty claim creation
        // This could include:
        // - Claim form with issue description
        // - Photo upload for damage
        // - Service center selection
        // - Claim tracking number generation
    }

    /**
     * Check if item has warranty
     */
    private itemHasWarranty(item: any): boolean {
        // Items in certain categories might have warranty
        const warrantyCategories = ['Electronics', 'Appliances', 'Equipment'];
        return item && warrantyCategories.includes(item.category);
    }

    /**
     * View related document
     */
    viewRelatedDocument(document: RelatedDocument): void {
        if (document.canView && document.url) {
            // Navigate to the related document
            this.router.navigate([document.url]);
        } else {
            this.toastService.info('Document viewing not available');
        }
    }

    /**
     * Download related document
     */
    downloadRelatedDocument(relatedDoc: RelatedDocument): void {
        if (!relatedDoc.canDownload) {
            this.toastService.warning('Document download not available');
            return;
        }

        this.actionLoading = true;

        // This would typically call a service method to download the document
        this.salesInvoiceService.downloadRelatedDocument(relatedDoc._id, relatedDoc.type)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${relatedDoc.reference}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    this.toastService.success('Document downloaded successfully');
                    this.actionLoading = false;
                },
                error: (error) => {
                    console.error('Error downloading document:', error);
                    this.toastService.error('Failed to download document');
                    this.actionLoading = false;
                }
            });
    }

    /**
     * Get audit event icon
     */
    getAuditEventIcon(eventType: string): string {
        const icons: { [key: string]: string } = {
            'creation': 'add_circle',
            'status_change': 'swap_horiz',
            'payment': 'payment',
            'stock_movement': 'inventory_2',
            'modification': 'edit',
            'notification': 'notifications',
            'export': 'download',
            'print': 'print'
        };
        return icons[eventType] || 'info';
    }

    /**
     * Get audit event color
     */
    getAuditEventColor(eventType: string): string {
        const colors: { [key: string]: string } = {
            'creation': 'primary',
            'status_change': 'accent',
            'payment': 'primary',
            'stock_movement': 'warn',
            'modification': 'accent',
            'notification': 'primary',
            'export': 'accent',
            'print': 'accent'
        };
        return colors[eventType] || 'primary';
    }

    /**
     * Get related document icon
     */
    getDocumentIcon(type: string): string {
        const icons: { [key: string]: string } = {
            'Estimate': 'request_quote',
            'Delivery Note': 'local_shipping',
            'Payment Receipt': 'receipt',
            'Return Note': 'keyboard_return',
            'Purchase Order': 'shopping_cart',
            'Warranty Document': 'verified'
        };
        return icons[type] || 'description';
    }

    /**
     * Get document status color
     */
    getDocumentStatusColor(status: string): string {
        const colors: { [key: string]: string } = {
            'generated': 'primary',
            'issued': 'primary',
            'converted': 'accent',
            'pending': 'warn',
            'cancelled': 'warn',
            'completed': 'primary'
        };
        return colors[status] || 'primary';
    }

    /**
     * Track audit trail items for ngFor performance
     */
    trackAuditItem(index: number, audit: AuditTrailEntry): string {
        return audit._id;
    }

    /**
     * Track warranty items for ngFor performance
     */
    trackWarrantyItem(index: number, warranty: WarrantyInfo): string {
        return warranty.itemId;
    }
}