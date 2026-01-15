const Invoice = require('../models/Invoice');

/**
 * Print Template Service
 * Phase 2 - Requirement 19: Multiple Print Formats and Templates
 * Task 62: Implement print format system
 */
class PrintTemplateService {
    /**
     * Generate print data for invoice based on format
     * Task 62.2 - Requirements 19.2-19.9
     * @param {string} invoiceId - Invoice ID
     * @param {string} format - Print format (optional, uses invoice's printFormat if not provided)
     * @returns {Promise<Object>} Print data
     */
    async generatePrintData(invoiceId, format = null) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        // Get invoice with all populated fields
        const invoice = await Invoice.findById(invoiceId)
            .populate('customerId', 'code name address city phone email gstNumber')
            .populate('supplierId', 'code name address city phone email gstNumber')
            .populate('items.itemId', 'code name unit')
            .populate('salesmanId', 'code name commissionRate')
            .populate('createdBy', 'username email')
            .lean();

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Use provided format or invoice's printFormat
        const printFormat = format || invoice.printFormat || 'standard';

        // Validate format
        const validFormats = [
            'standard', 'logo', 'letterhead', 'thermal',
            'estimate', 'voucher', 'store_copy', 'tax_invoice', 'warranty_bill'
        ];

        if (!validFormats.includes(printFormat)) {
            throw new Error(`Invalid print format: ${printFormat}`);
        }

        // Build base print data
        const printData = {
            format: printFormat,
            invoice: this._prepareInvoiceData(invoice),
            party: this._preparePartyData(invoice),
            items: this._prepareItemsData(invoice, printFormat),
            totals: this._prepareTotalsData(invoice, printFormat),
            metadata: this._prepareMetadata(invoice, printFormat),
            formatting: this._getFormatSpecificSettings(printFormat),
            generatedAt: new Date()
        };

        return printData;
    }

    _prepareInvoiceData(invoice) {
        return {
            id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            type: invoice.type,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            status: invoice.status,
            paymentStatus: invoice.paymentStatus,
            supplierBillNo: invoice.supplierBillNo,
            dimension: invoice.dimension,
            biltyNo: invoice.biltyNo,
            biltyDate: invoice.biltyDate,
            transportCompany: invoice.transportCompany,
            transportCharges: invoice.transportCharges,
            cartonQty: invoice.cartonQty,
            estimatePrint: invoice.estimatePrint,
            // Phase 2 - Notes/Memo (Task 77.2)
            notes: invoice.notes,
            memoNo: invoice.memoNo,
            // Phase 2 - Warranty information (Task 76.3)
            warrantyInfo: invoice.warrantyInfo,
            warrantyPaste: invoice.warrantyPaste
        };
    }

    /**
     * Prepare party (customer/supplier) data
     * @private
     */
    _preparePartyData(invoice) {
        const party = invoice.customerId || invoice.supplierId;

        if (!party) {
            return null;
        }

        return {
            id: party._id,
            code: party.code,
            name: party.name,
            address: party.address,
            city: party.city,
            phone: party.phone,
            email: party.email,
            gstNumber: party.gstNumber
        };
    }

    /**
     * Prepare items data based on format
     * @private
     */
    _prepareItemsData(invoice, format) {
        return invoice.items.map(item => {
            const baseItem = {
                itemId: item.itemId?._id,
                itemCode: item.itemId?.code,
                itemName: item.itemId?.name,
                unit: item.itemId?.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal
            };

            // Add format-specific fields
            if (format !== 'thermal' && format !== 'estimate') {
                baseItem.discount = item.discount;
                baseItem.gstRate = item.gstRate;
                baseItem.gstAmount = item.gstAmount;
            }

            if (format === 'store_copy') {
                baseItem.batchNumber = item.batchNumber;
                baseItem.expiryDate = item.expiryDate;
                baseItem.boxQuantity = item.boxQuantity;
                baseItem.unitQuantity = item.unitQuantity;
            }

            if (format === 'warranty_bill') {
                baseItem.warrantyMonths = item.warrantyMonths;
                baseItem.warrantyDetails = item.warrantyDetails;
            }

            if (format === 'tax_invoice') {
                baseItem.discount = item.discount;
                baseItem.gstRate = item.gstRate;
                baseItem.gstAmount = item.gstAmount;
                baseItem.advanceTaxAmount = item.advanceTaxAmount;
            }

            return baseItem;
        });
    }

    /**
     * Prepare totals data based on format
     * @private
     */
    _prepareTotalsData(invoice, format) {
        const baseTotals = {
            subtotal: invoice.totals.subtotal,
            grandTotal: invoice.totals.grandTotal
        };

        // Thermal and estimate formats show minimal totals
        if (format === 'thermal' || format === 'estimate') {
            return baseTotals;
        }

        // Standard formats include all totals
        baseTotals.totalDiscount = invoice.totals.totalDiscount;
        baseTotals.totalTax = invoice.totals.totalTax;

        // Tax invoice shows detailed tax breakdown
        if (format === 'tax_invoice') {
            baseTotals.gst4Total = invoice.totals.gst4Total;
            baseTotals.gst18Total = invoice.totals.gst18Total;
            baseTotals.advanceTaxTotal = invoice.totals.advanceTaxTotal;
            baseTotals.nonFilerGSTTotal = invoice.totals.nonFilerGSTTotal;
            baseTotals.incomeTaxTotal = invoice.totals.incomeTaxTotal;
        }

        // Voucher format includes payment details
        if (format === 'voucher') {
            baseTotals.paidAmount = invoice.paidAmount || 0;
            baseTotals.remainingAmount = invoice.totals.grandTotal - (invoice.paidAmount || 0);
        }

        return baseTotals;
    }

    /**
     * Prepare metadata based on format
     * @private
     */
    _prepareMetadata(invoice, format) {
        const metadata = {
            printedAt: new Date(),
            printedBy: invoice.createdBy?.username || 'System'
        };

        // Add format-specific labels
        if (format === 'estimate') {
            metadata.documentLabel = invoice.estimatePrint ? 'ESTIMATE' : 'QUOTATION';
            metadata.isEstimate = true;
        } else {
            metadata.documentLabel = this._getDocumentLabel(invoice.type);
            metadata.isEstimate = false;
        }

        // Add logo inclusion flag (Task 62.3)
        metadata.includeLogo = this._shouldIncludeLogo(format);

        // Add warranty info flag
        metadata.includeWarranty = (format === 'warranty_bill');

        // Add store copy flag
        metadata.isStoreCopy = (format === 'store_copy');

        // Add tax invoice flag
        metadata.isTaxInvoice = (format === 'tax_invoice');

        // Phase 2 - Notes/Memo display (Task 77.2)
        metadata.hasNotes = !!(invoice.notes && invoice.notes.trim());
        metadata.hasMemoNo = !!(invoice.memoNo && invoice.memoNo.trim());
        metadata.showNotesProminent = metadata.hasNotes || metadata.hasMemoNo;

        return metadata;
    }

    /**
     * Get format-specific settings
     * @private
     */
    _getFormatSpecificSettings(format) {
        const settings = {
            format: format,
            pageSize: 'A4',
            orientation: 'portrait',
            fontSize: 'normal',
            showHeader: true,
            showFooter: true,
            showLineNumbers: true,
            showBankDetails: true
        };

        // Thermal format settings (Task 62.4)
        if (format === 'thermal') {
            settings.pageSize = '80mm';
            settings.fontSize = 'small';
            settings.showHeader = false;
            settings.showFooter = false;
            settings.showLineNumbers = false;
            settings.showBankDetails = false;
            settings.compactLayout = true;
        }

        // Estimate format settings (Task 62.5)
        if (format === 'estimate') {
            settings.showPaymentStatus = false;
            settings.showBankDetails = false;
            settings.watermark = 'ESTIMATE';
        }

        // Voucher format settings (Task 62.6)
        if (format === 'voucher') {
            settings.showPaymentDetails = true;
            settings.showBankDetails = true;
            settings.emphasizePayment = true;
        }

        // Store copy format settings (Task 62.7)
        if (format === 'store_copy') {
            settings.showWarehouseDetails = true;
            settings.showBatchDetails = true;
            settings.showBoxQuantities = true;
            settings.watermark = 'STORE COPY';
        }

        // Tax invoice format settings (Task 62.8)
        if (format === 'tax_invoice') {
            settings.showTaxBreakdown = true;
            settings.showGSTNumbers = true;
            settings.showTaxRegistration = true;
            settings.emphasizeTax = true;
        }

        // Warranty bill format settings (Task 62.9)
        if (format === 'warranty_bill') {
            settings.showWarrantyInfo = true;
            settings.showWarrantyTerms = true;
            settings.includeLogo = true;
        }

        return settings;
    }

    /**
     * Determine if logo should be included (Task 62.3)
     * @private
     */
    _shouldIncludeLogo(format) {
        // Include logo for these formats
        const logoFormats = ['logo', 'warranty_bill', 'standard'];

        // Exclude logo for letterhead (assumes letterhead already has logo)
        if (format === 'letterhead') {
            return false;
        }

        return logoFormats.includes(format);
    }

    /**
     * Get document label based on invoice type
     * @private
     */
    _getDocumentLabel(type) {
        const labels = {
            'sales': 'SALES INVOICE',
            'purchase': 'PURCHASE INVOICE',
            'return_sales': 'SALES RETURN',
            'return_purchase': 'PURCHASE RETURN'
        };

        return labels[type] || 'INVOICE';
    }

    /**
     * Get available print formats
     * @returns {Array} List of available formats
     */
    getAvailableFormats() {
        return [
            {
                value: 'standard',
                label: 'Standard',
                description: 'Standard invoice format with all details'
            },
            {
                value: 'logo',
                label: 'With Logo',
                description: 'Standard format with business logo'
            },
            {
                value: 'letterhead',
                label: 'Letterhead',
                description: 'For pre-printed letterhead (no logo)'
            },
            {
                value: 'thermal',
                label: 'Thermal',
                description: 'Compact format for thermal printers (80mm)'
            },
            {
                value: 'estimate',
                label: 'Estimate/Quotation',
                description: 'Estimate or quotation format'
            },
            {
                value: 'voucher',
                label: 'Payment Voucher',
                description: 'Payment voucher with payment details'
            },
            {
                value: 'store_copy',
                label: 'Store Copy',
                description: 'Internal copy with warehouse details'
            },
            {
                value: 'tax_invoice',
                label: 'Tax Invoice',
                description: 'Detailed tax invoice with tax breakdown'
            },
            {
                value: 'warranty_bill',
                label: 'Warranty Bill',
                description: 'Invoice with warranty information'
            }
        ];
    }
}

module.exports = new PrintTemplateService();
