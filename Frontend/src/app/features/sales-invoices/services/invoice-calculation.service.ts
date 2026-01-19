/**
 * Invoice Calculation Service
 * 
 * This service handles all business logic calculations for sales invoices
 * including tax calculations, discounts, totals, and validation.
 */

import { Injectable } from '@angular/core';
import {
    InvoiceItem,
    InvoiceTotals,
    DiscountType,
    SalesInvoice,
    CreateInvoiceRequest,
    PaymentStatus
} from '../models';

@Injectable({
    providedIn: 'root'
})
export class InvoiceCalculationService {

    /**
     * Calculate item totals including tax and discount
     */
    calculateItemTotal(item: Partial<InvoiceItem>): number {
        if (!item.quantity || !item.unitPrice) {
            return 0;
        }

        const subtotal = item.quantity * item.unitPrice;
        const discountAmount = this.calculateItemDiscount(subtotal, item.discount || 0, item.discountType || DiscountType.PERCENTAGE);
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = this.calculateItemTax(taxableAmount, item);

        return taxableAmount + taxAmount;
    }

    /**
     * Calculate item discount amount
     */
    calculateItemDiscount(subtotal: number, discount: number, discountType: DiscountType): number {
        if (!discount || discount <= 0) {
            return 0;
        }

        if (discountType === DiscountType.PERCENTAGE) {
            return (subtotal * discount) / 100;
        } else {
            return Math.min(discount, subtotal); // Discount cannot exceed subtotal
        }
    }

    /**
     * Calculate item tax amount (GST and WHT)
     */
    calculateItemTax(taxableAmount: number, item: Partial<InvoiceItem>): number {
        if (!taxableAmount || taxableAmount <= 0) {
            return 0;
        }

        // Get tax rates from item (assuming they're available in the item object)
        const gstRate = (item.item?.gstRate || 0) / 100;
        const whtRate = (item.item?.whtRate || 0) / 100;

        const gstAmount = taxableAmount * gstRate;
        const whtAmount = taxableAmount * whtRate;

        // GST is added, WHT is deducted
        return gstAmount - whtAmount;
    }

    /**
     * Calculate complete invoice totals
     */
    calculateInvoiceTotals(
        items: Partial<InvoiceItem>[],
        invoiceDiscountType: DiscountType = DiscountType.PERCENTAGE,
        invoiceDiscountValue: number = 0
    ): InvoiceTotals {
        // Calculate item-level totals
        let subtotal = 0;
        let totalGST = 0;
        let totalWHT = 0;

        items.forEach(item => {
            if (item.quantity && item.unitPrice) {
                const itemSubtotal = item.quantity * item.unitPrice;
                const itemDiscountAmount = this.calculateItemDiscount(
                    itemSubtotal,
                    item.discount || 0,
                    item.discountType || DiscountType.PERCENTAGE
                );
                const itemTaxableAmount = itemSubtotal - itemDiscountAmount;

                subtotal += itemSubtotal;

                // Calculate GST and WHT separately
                const gstRate = (item.item?.gstRate || 0) / 100;
                const whtRate = (item.item?.whtRate || 0) / 100;

                totalGST += itemTaxableAmount * gstRate;
                totalWHT += itemTaxableAmount * whtRate;
            }
        });

        // Calculate invoice-level discount
        const invoiceDiscountAmount = this.calculateInvoiceDiscount(
            subtotal,
            invoiceDiscountValue,
            invoiceDiscountType
        );

        // Calculate taxable amount after invoice discount
        const taxableAmount = subtotal - invoiceDiscountAmount;

        // Recalculate taxes on the discounted amount if invoice discount is applied
        let finalGSTAmount = totalGST;
        let finalWHTAmount = totalWHT;

        if (invoiceDiscountAmount > 0 && subtotal > 0) {
            const discountRatio = taxableAmount / subtotal;
            finalGSTAmount = totalGST * discountRatio;
            finalWHTAmount = totalWHT * discountRatio;
        }

        const grandTotal = taxableAmount + finalGSTAmount - finalWHTAmount;

        return {
            subtotal: this.roundToTwoDecimals(subtotal),
            discountAmount: this.roundToTwoDecimals(invoiceDiscountAmount),
            taxableAmount: this.roundToTwoDecimals(taxableAmount),
            gstAmount: this.roundToTwoDecimals(finalGSTAmount),
            whtAmount: this.roundToTwoDecimals(finalWHTAmount),
            grandTotal: this.roundToTwoDecimals(grandTotal)
        };
    }

    /**
     * Calculate invoice-level discount
     */
    calculateInvoiceDiscount(subtotal: number, discount: number, discountType: DiscountType): number {
        if (!discount || discount <= 0 || !subtotal || subtotal <= 0) {
            return 0;
        }

        if (discountType === DiscountType.PERCENTAGE) {
            return (subtotal * discount) / 100;
        } else {
            return Math.min(discount, subtotal); // Discount cannot exceed subtotal
        }
    }

    /**
     * Validate payment amount against invoice total
     */
    validatePaymentAmount(paymentAmount: number, invoice: SalesInvoice): {
        isValid: boolean;
        error?: string;
        remainingAmount?: number;
    } {
        if (paymentAmount <= 0) {
            return {
                isValid: false,
                error: 'Payment amount must be greater than zero'
            };
        }

        const remainingAmount = invoice.payment.remainingAmount;

        if (paymentAmount > remainingAmount) {
            return {
                isValid: false,
                error: `Payment amount cannot exceed remaining amount of ${remainingAmount.toFixed(2)}`
            };
        }

        return {
            isValid: true,
            remainingAmount: remainingAmount - paymentAmount
        };
    }

    /**
     * Check if customer credit limit is exceeded
     */
    checkCreditLimit(
        customerCreditLimit: number,
        customerCurrentBalance: number,
        invoiceTotal: number
    ): {
        isExceeded: boolean;
        availableCredit: number;
        excessAmount?: number;
    } {
        if (!customerCreditLimit || customerCreditLimit <= 0) {
            return {
                isExceeded: false,
                availableCredit: Infinity
            };
        }

        const availableCredit = customerCreditLimit - customerCurrentBalance;
        const isExceeded = invoiceTotal > availableCredit;

        return {
            isExceeded,
            availableCredit: Math.max(0, availableCredit),
            excessAmount: isExceeded ? invoiceTotal - availableCredit : undefined
        };
    }

    /**
     * Calculate total balance including previous balance
     */
    calculateTotalBalance(invoiceTotal: number, previousBalance: number): number {
        return this.roundToTwoDecimals(invoiceTotal + (previousBalance || 0));
    }

    /**
     * Calculate payment status based on paid amount and total
     */
    calculatePaymentStatus(paidAmount: number, totalAmount: number): PaymentStatus {
        if (paidAmount <= 0) {
            return PaymentStatus.PENDING;
        } else if (paidAmount >= totalAmount) {
            return PaymentStatus.PAID;
        } else {
            return PaymentStatus.PARTIAL;
        }
    }

    /**
     * Calculate remaining amount after payment
     */
    calculateRemainingAmount(totalAmount: number, paidAmount: number): number {
        return this.roundToTwoDecimals(Math.max(0, totalAmount - paidAmount));
    }

    /**
     * Calculate due date based on payment terms
     */
    calculateDueDate(invoiceDate: Date, paymentTermsDays: number = 30): Date {
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + paymentTermsDays);
        return dueDate;
    }

    /**
     * Check if invoice is overdue
     */
    isInvoiceOverdue(dueDate: Date, paymentStatus: PaymentStatus): boolean {
        if (paymentStatus === PaymentStatus.PAID) {
            return false;
        }
        return new Date() > new Date(dueDate);
    }

    /**
     * Calculate days overdue
     */
    calculateDaysOverdue(dueDate: Date): number {
        const today = new Date();
        const due = new Date(dueDate);

        if (today <= due) {
            return 0;
        }

        const diffTime = today.getTime() - due.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Validate invoice items
     */
    validateInvoiceItems(items: Partial<InvoiceItem>[]): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!items || items.length === 0) {
            errors.push('At least one item is required');
        }

        items.forEach((item, index) => {
            if (!item.itemId) {
                errors.push(`Item ${index + 1}: Item selection is required`);
            }

            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Quantity must be greater than zero`);
            }

            if (!item.unitPrice || item.unitPrice <= 0) {
                errors.push(`Item ${index + 1}: Unit price must be greater than zero`);
            }

            if (item.discount && item.discount < 0) {
                errors.push(`Item ${index + 1}: Discount cannot be negative`);
            }

            if (item.discountType === DiscountType.PERCENTAGE && item.discount && item.discount > 100) {
                errors.push(`Item ${index + 1}: Percentage discount cannot exceed 100%`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate invoice data before submission
     */
    validateInvoice(invoice: CreateInvoiceRequest): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Basic validations
        if (!invoice.customerId) {
            errors.push('Customer selection is required');
        }

        if (!invoice.invoiceDate) {
            errors.push('Invoice date is required');
        }

        if (!invoice.dueDate) {
            errors.push('Due date is required');
        }

        if (!invoice.warehouseId) {
            errors.push('Warehouse selection is required');
        }

        // Date validations
        if (invoice.invoiceDate && invoice.dueDate) {
            const invoiceDate = new Date(invoice.invoiceDate);
            const dueDate = new Date(invoice.dueDate);

            if (dueDate < invoiceDate) {
                errors.push('Due date cannot be earlier than invoice date');
            }
        }

        // Items validation
        const itemValidation = this.validateInvoiceItems(invoice.items);
        if (!itemValidation.isValid) {
            errors.push(...itemValidation.errors);
        }

        // Discount validation
        if (invoice.discountValue && invoice.discountValue < 0) {
            errors.push('Invoice discount cannot be negative');
        }

        if (invoice.discountType === DiscountType.PERCENTAGE &&
            invoice.discountValue && invoice.discountValue > 100) {
            errors.push('Percentage discount cannot exceed 100%');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate customer credit limit and payment terms
     */
    validateCustomerCredit(
        customerId: string,
        customerCreditLimit: number,
        customerCurrentBalance: number,
        invoiceTotal: number,
        customerPaymentTerms?: number
    ): {
        isValid: boolean;
        warnings: string[];
        errors: string[];
    } {
        const warnings: string[] = [];
        const errors: string[] = [];

        // Check credit limit
        const creditCheck = this.checkCreditLimit(customerCreditLimit, customerCurrentBalance, invoiceTotal);

        if (creditCheck.isExceeded) {
            if (customerCreditLimit > 0) {
                errors.push(`Credit limit exceeded by ${creditCheck.excessAmount?.toFixed(2)}. Available credit: ${creditCheck.availableCredit.toFixed(2)}`);
            } else {
                warnings.push('Customer has no credit limit set');
            }
        }

        // Check payment terms
        if (!customerPaymentTerms || customerPaymentTerms <= 0) {
            warnings.push('Customer has no payment terms defined. Using default 30 days.');
        }

        return {
            isValid: errors.length === 0,
            warnings,
            errors
        };
    }

    /**
     * Calculate aging analysis for invoice
     */
    calculateAgingAnalysis(invoiceDate: Date, dueDate: Date, paymentStatus: PaymentStatus): {
        agingCategory: 'current' | '1-30' | '31-60' | '61-90' | '90+';
        daysOutstanding: number;
        isOverdue: boolean;
    } {
        const today = new Date();
        const invoice = new Date(invoiceDate);
        const due = new Date(dueDate);

        const daysOutstanding = Math.ceil((today.getTime() - invoice.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = this.isInvoiceOverdue(due, paymentStatus);

        let agingCategory: 'current' | '1-30' | '31-60' | '61-90' | '90+' = 'current';

        if (isOverdue) {
            const daysOverdue = this.calculateDaysOverdue(due);
            if (daysOverdue <= 30) {
                agingCategory = '1-30';
            } else if (daysOverdue <= 60) {
                agingCategory = '31-60';
            } else if (daysOverdue <= 90) {
                agingCategory = '61-90';
            } else {
                agingCategory = '90+';
            }
        }

        return {
            agingCategory,
            daysOutstanding,
            isOverdue
        };
    }

    /**
     * Round number to two decimal places
     */
    private roundToTwoDecimals(value: number): number {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    /**
     * Format currency for display
     */
    formatCurrency(amount: number, currency: string = 'PKR'): string {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Format percentage for display
     */
    formatPercentage(value: number): string {
        return `${value.toFixed(2)}%`;
    }
}