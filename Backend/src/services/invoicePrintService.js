const Invoice = require('../models/Invoice');

/**
 * Invoice Print Service
 * Handles invoice print data preparation with warranty and logo
 */
class InvoicePrintService {
  /**
   * Prepare print data for an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} format - Print format
   * @returns {Promise<Object>} Print-ready invoice data
   */
  async preparePrintData(invoiceId, format = 'standard') {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    const validFormats = [
      'standard',
      'logo',
      'letterhead',
      'thermal',
      'estimate',
      'voucher',
      'store_copy',
      'tax_invoice',
      'warranty_bill'
    ];

    if (!validFormats.includes(format)) {
      throw new Error(`Invalid print format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Fetch invoice with populated references
    const invoice = await Invoice.findById(invoiceId)
      .populate('customerId', 'name code address phone email')
      .populate('supplierId', 'name code address phone email')
      .populate('items.itemId', 'name code description')
      .populate('createdBy', 'username');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Base print data
    const printData = {
      invoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        notes: invoice.notes
      },
      format,
      printDate: new Date(),
      items: this._formatItems(invoice.items),
      totals: invoice.totals,
      createdBy: invoice.createdBy?.username || 'Unknown'
    };

    // Add customer or supplier info based on invoice type
    if (invoice.type === 'sales' || invoice.type === 'return_sales') {
      printData.customer = this._formatPartyInfo(invoice.customerId);
    } else if (invoice.type === 'purchase' || invoice.type === 'return_purchase') {
      printData.supplier = this._formatPartyInfo(invoice.supplierId);
      printData.supplierBillNo = invoice.supplierBillNo;
    }

    // Add warranty information if warrantyPaste is true
    if (invoice.warrantyPaste && invoice.warrantyInfo) {
      printData.warranty = {
        info: invoice.warrantyInfo,
        items: invoice.items
          .filter(item => item.warrantyMonths && item.warrantyMonths > 0)
          .map(item => ({
            itemName: item.itemId?.name || 'Unknown',
            warrantyMonths: item.warrantyMonths,
            warrantyDetails: item.warrantyDetails
          }))
      };
    }

    // Add business logo based on format
    if (['logo', 'letterhead', 'warranty_bill'].includes(format) && invoice.businessLogo) {
      printData.businessLogo = invoice.businessLogo;
    }

    // Add format-specific data
    printData.formatSpecific = this._getFormatSpecificData(invoice, format);

    // Add PO information if available
    if (invoice.poNumber || invoice.poId) {
      printData.purchaseOrder = {
        poNumber: invoice.poNumber,
        poId: invoice.poId
      };
    }

    // Add salesman info if available
    if (invoice.salesmanId) {
      printData.salesmanId = invoice.salesmanId;
    }

    // Add transport details for purchase invoices
    if (invoice.type === 'purchase' && invoice.biltyNo) {
      printData.transport = {
        biltyNo: invoice.biltyNo,
        biltyDate: invoice.biltyDate,
        transportCompany: invoice.transportCompany,
        transportCharges: invoice.transportCharges
      };
    }

    return printData;
  }

  /**
   * Format invoice items for printing
   * @param {Array} items - Invoice items
   * @returns {Array} Formatted items
   */
  _formatItems(items) {
    return items.map((item, index) => ({
      sno: index + 1,
      itemId: item.itemId?._id,
      itemName: item.itemId?.name || 'Unknown',
      itemCode: item.itemId?.code || '',
      description: item.itemId?.description || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      // Box/Unit quantities
      boxQuantity: item.boxQuantity || 0,
      unitQuantity: item.unitQuantity || 0,
      boxRate: item.boxRate || 0,
      unitRate: item.unitRate || 0,
      // Discounts
      discount: item.discount || 0,
      discount1Percent: item.discount1Percent || 0,
      discount1Amount: item.discount1Amount || 0,
      discount2Percent: item.discount2Percent || 0,
      discount2Amount: item.discount2Amount || 0,
      // Schemes
      scheme1Quantity: item.scheme1Quantity || 0,
      scheme2Quantity: item.scheme2Quantity || 0,
      // Tax
      taxAmount: item.taxAmount || 0,
      advanceTaxPercent: item.advanceTaxPercent || 0,
      advanceTaxAmount: item.advanceTaxAmount || 0,
      // Total
      lineTotal: item.lineTotal,
      // Warranty
      warrantyMonths: item.warrantyMonths || 0,
      warrantyDetails: item.warrantyDetails || '',
      // Warehouse
      warehouseId: item.warehouseId,
      // Dimension
      dimension: item.dimension
    }));
  }

  /**
   * Format party (customer/supplier) information
   * @param {Object} party - Party object
   * @returns {Object} Formatted party info
   */
  _formatPartyInfo(party) {
    if (!party) return null;

    return {
      _id: party._id,
      name: party.name,
      code: party.code,
      address: party.address,
      phone: party.phone,
      email: party.email
    };
  }

  /**
   * Get format-specific data
   * @param {Object} invoice - Invoice object
   * @param {string} format - Print format
   * @returns {Object} Format-specific data
   */
  _getFormatSpecificData(invoice, format) {
    const data = {};

    switch (format) {
      case 'estimate':
        data.isEstimate = true;
        data.estimatePrint = invoice.estimatePrint;
        data.title = 'ESTIMATE / QUOTATION';
        break;

      case 'voucher':
        data.isVoucher = true;
        data.title = 'PAYMENT VOUCHER';
        break;

      case 'store_copy':
        data.isStoreCopy = true;
        data.title = 'STORE COPY';
        data.watermark = 'STORE COPY - NOT FOR CUSTOMER';
        break;

      case 'tax_invoice':
        data.isTaxInvoice = true;
        data.title = 'TAX INVOICE';
        data.showTaxBreakdown = true;
        break;

      case 'warranty_bill':
        data.isWarrantyBill = true;
        data.title = 'WARRANTY BILL';
        data.showWarrantyDetails = true;
        break;

      case 'thermal':
        data.isThermal = true;
        data.paperWidth = '80mm';
        data.compactMode = true;
        break;

      case 'letterhead':
        data.isLetterhead = true;
        data.showCompanyHeader = true;
        break;

      case 'logo':
        data.showLogo = true;
        break;

      default:
        data.isStandard = true;
        data.title = 'INVOICE';
    }

    return data;
  }

  /**
   * Generate print preview URL
   * @param {string} invoiceId - Invoice ID
   * @param {string} format - Print format
   * @returns {string} Preview URL
   */
  generatePrintPreviewUrl(invoiceId, format = 'standard') {
    return `/api/invoices/${invoiceId}/print?format=${format}&preview=true`;
  }

  /**
   * Generate print download URL
   * @param {string} invoiceId - Invoice ID
   * @param {string} format - Print format
   * @returns {string} Download URL
   */
  generatePrintDownloadUrl(invoiceId, format = 'standard') {
    return `/api/invoices/${invoiceId}/print?format=${format}&download=true`;
  }

  /**
   * Validate print format
   * @param {string} format - Print format
   * @returns {boolean} Is valid
   */
  isValidFormat(format) {
    const validFormats = [
      'standard',
      'logo',
      'letterhead',
      'thermal',
      'estimate',
      'voucher',
      'store_copy',
      'tax_invoice',
      'warranty_bill'
    ];

    return validFormats.includes(format);
  }
}

module.exports = new InvoicePrintService();
