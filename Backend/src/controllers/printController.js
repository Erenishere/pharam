const printTemplateService = require('../services/printTemplateService');

/**
 * Print Controller
 * Phase 2 - Requirement 19: Multiple Print Formats and Templates
 * Task 63: Create print API endpoints
 */
class PrintController {
    /**
     * Get print data for invoice
     * Task 63.1 - Requirement 19.1
     * GET /api/invoices/:id/print
     * Query params: format (optional)
     */
    async getPrintData(req, res) {
        try {
            const { id } = req.params;
            const { format } = req.query;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Invoice ID is required'
                });
            }

            const printData = await printTemplateService.generatePrintData(id, format);

            res.status(200).json({
                success: true,
                data: printData
            });
        } catch (error) {
            console.error('Error generating print data:', error);

            if (error.message === 'Invoice not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            if (error.message.includes('Invalid print format')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate print data'
            });
        }
    }

    /**
     * Generate PDF for invoice
     * Task 63.2 - Requirement 19.1
     * GET /api/invoices/:id/pdf
     * Query params: format (optional)
     * 
     * Note: This is a placeholder implementation.
     * In production, integrate with a PDF library like PDFKit or Puppeteer
     */
    async generatePDF(req, res) {
        try {
            const { id } = req.params;
            const { format } = req.query;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Invoice ID is required'
                });
            }

            // Get print data
            const printData = await printTemplateService.generatePrintData(id, format);

            // TODO: Integrate with PDF generation library
            // For now, return a message indicating PDF generation is not yet implemented
            // In production, you would:
            // 1. Use PDFKit, Puppeteer, or similar library
            // 2. Generate PDF from printData
            // 3. Set appropriate headers
            // 4. Stream PDF to response

            res.status(501).json({
                success: false,
                message: 'PDF generation not yet implemented. Use print data endpoint instead.',
                printData: printData,
                note: 'Integrate with PDFKit, Puppeteer, or similar library for PDF generation'
            });

            // Example implementation with PDFKit (commented out):
            /*
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument();
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${printData.invoice.invoiceNumber}.pdf`);
            
            doc.pipe(res);
            
            // Add content based on printData
            doc.fontSize(20).text(printData.metadata.documentLabel, { align: 'center' });
            doc.fontSize(12).text(`Invoice #: ${printData.invoice.invoiceNumber}`);
            // ... add more content
            
            doc.end();
            */
        } catch (error) {
            console.error('Error generating PDF:', error);

            if (error.message === 'Invoice not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            if (error.message.includes('Invalid print format')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate PDF'
            });
        }
    }

    /**
     * Get available print formats
     * GET /api/print/formats
     */
    async getAvailableFormats(req, res) {
        try {
            const formats = printTemplateService.getAvailableFormats();

            res.status(200).json({
                success: true,
                data: formats
            });
        } catch (error) {
            console.error('Error getting formats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get available formats'
            });
        }
    }
}

module.exports = new PrintController();
