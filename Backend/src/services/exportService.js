const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Export Service
 * Handles data export to various formats (CSV, Excel, PDF)
 */
class ExportService {
  /**
   * Export data to CSV format
   * @param {Array} data - Data to export
   * @param {Array} columns - Column definitions
   * @returns {string} CSV string
   */
  exportToCSV(data, columns) {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Create header row
    const headers = columns.map((col) => col.label || col.key).join(',');

    // Create data rows
    const rows = data.map((item) => {
      return columns
        .map((col) => {
          const value = this._getNestedValue(item, col.key);
          return this._escapeCSVValue(value);
        })
        .join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Export data to Excel format using ExcelJS
   * @param {Array} data - Data to export
   * @param {Array} columns - Column definitions
   * @param {string} sheetName - Sheet name
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async exportToExcel(data, columns, sheetName = 'Sheet1') {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Set up columns
    worksheet.columns = columns.map((col) => ({
      header: col.label || col.key,
      key: col.key,
      width: col.width || 15,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach((item) => {
      const row = {};
      columns.forEach((col) => {
        row[col.key] = this._getNestedValue(item, col.key);
      });
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Generate buffer
    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Export data to PDF format using PDFKit
   * @param {Object} reportData - Report data
   * @param {Object} options - PDF options
   * @returns {Promise<Buffer>} PDF file buffer
   */
  async exportToPDF(reportData, options = {}) {
    const {
      title = 'Report',
      orientation = 'portrait',
      includeHeader = true,
      includeFooter = true,
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: orientation,
          margin: 50,
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        if (includeHeader) {
          doc.fontSize(20).text(title, { align: 'center' });
          doc.moveDown();
          doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
          doc.moveDown();
        }

        // Content
        if (reportData.summary) {
          doc.fontSize(14).text('Summary', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          Object.entries(reportData.summary).forEach(([key, value]) => {
            doc.text(`${this._formatLabel(key)}: ${this._formatValue(value)}`);
          });
          doc.moveDown();
        }

        // Table data
        if (reportData.data && Array.isArray(reportData.data)) {
          this._drawTable(doc, reportData.data, reportData.columns || []);
        }

        // Footer
        if (includeFooter) {
          const pages = doc.bufferedPageRange();
          for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).text(
              `Page ${i + 1} of ${pages.count}`,
              50,
              doc.page.height - 50,
              { align: 'center' }
            );
          }
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Draw table in PDF
   * @private
   */
  _drawTable(doc, data, columns) {
    if (!data || data.length === 0) return;

    const tableTop = doc.y;
    const itemHeight = 20;
    const pageHeight = doc.page.height - 100;

    // Draw headers
    doc.fontSize(10).font('Helvetica-Bold');
    let xPos = 50;
    columns.forEach((col) => {
      doc.text(col.label || col.key, xPos, tableTop, { width: col.width || 100 });
      xPos += col.width || 100;
    });

    doc.moveDown();
    doc.font('Helvetica');

    // Draw rows
    data.forEach((row, index) => {
      if (doc.y > pageHeight) {
        doc.addPage();
      }

      xPos = 50;
      const yPos = doc.y;

      columns.forEach((col) => {
        const value = this._getNestedValue(row, col.key);
        doc.text(this._formatValue(value), xPos, yPos, { width: col.width || 100 });
        xPos += col.width || 100;
      });

      doc.moveDown(0.5);
    });
  }

  /**
   * Format label for display
   * @private
   */
  _formatLabel(label) {
    return label
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format value for display
   * @private
   */
  _formatValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return String(value);
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  _getNestedValue(obj, path) {
    if (!path) return '';

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return '';
      }
    }

    return value !== null && value !== undefined ? value : '';
  }

  /**
   * Escape CSV value
   * @private
   */
  _escapeCSVValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Format report for export
   * @param {Object} report - Report data
   * @param {string} format - Export format (csv, excel, pdf)
   * @returns {Promise<Object|string|Buffer>} Formatted export data
   */
  async formatReportForExport(report, format) {
    if (!report) {
      throw new Error('Report data is required');
    }

    const columns = this._getColumnsForReportType(report.reportType);
    const data = this._flattenReportData(report);

    switch (format.toLowerCase()) {
      case 'csv':
        return this.exportToCSV(data, columns);
      case 'excel':
        return await this.exportToExcel(data, columns, report.reportType);
      case 'pdf':
        return await this.exportToPDF(
          { ...report, data, columns },
          { title: this._formatLabel(report.reportType) }
        );
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get columns for report type
   * @private
   */
  _getColumnsForReportType(reportType) {
    const columnMaps = {
      sales: [
        { key: 'invoiceNumber', label: 'Invoice Number' },
        { key: 'invoiceDate', label: 'Date' },
        { key: 'customerId.name', label: 'Customer' },
        { key: 'totals.grandTotal', label: 'Amount' },
        { key: 'status', label: 'Status' },
      ],
      purchase: [
        { key: 'invoiceNumber', label: 'Invoice Number' },
        { key: 'invoiceDate', label: 'Date' },
        { key: 'supplierId.name', label: 'Supplier' },
        { key: 'totals.grandTotal', label: 'Amount' },
        { key: 'status', label: 'Status' },
      ],
      inventory: [
        { key: 'code', label: 'Item Code' },
        { key: 'name', label: 'Item Name' },
        { key: 'category', label: 'Category' },
        { key: 'stock.currentStock', label: 'Stock' },
        { key: 'pricing.salePrice', label: 'Price' },
      ],
      profit_loss: [
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount' },
      ],
      balance_sheet: [
        { key: 'account', label: 'Account' },
        { key: 'amount', label: 'Amount' },
      ],
    };

    return columnMaps[reportType] || [{ key: 'data', label: 'Data' }];
  }

  /**
   * Flatten report data for export
   * @private
   */
  _flattenReportData(report) {
    if (report.invoices && Array.isArray(report.invoices)) {
      return report.invoices;
    }
    if (report.items && Array.isArray(report.items)) {
      return report.items;
    }
    if (report.data && Array.isArray(report.data)) {
      return report.data;
    }

    // For financial reports, create structured data
    if (report.reportType === 'profit_loss') {
      return [
        { description: 'Revenue', amount: report.revenue?.netSales || 0 },
        { description: 'Cost of Goods Sold', amount: report.costOfGoodsSold?.netPurchases || 0 },
        { description: 'Gross Profit', amount: report.grossProfit?.amount || 0 },
        { description: 'Net Profit', amount: report.netProfit?.amount || 0 },
      ];
    }

    return [];
  }
}

module.exports = new ExportService();
