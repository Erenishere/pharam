const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');

describe('Invoice Model - Supplier Bill Number Validation', () => {
  beforeEach(async () => {
    // Clear invoices collection before each test
    await Invoice.deleteMany({});
  });

  describe('Pre-save validation for supplier bill number', () => {
    test('should require supplier bill number for purchase invoices', async () => {
      const invoice = new Invoice({
        type: 'purchase',
        supplierId: new mongoose.Types.ObjectId(),
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
        // Missing supplierBillNo
      });

      await expect(invoice.save()).rejects.toThrow('Supplier bill number is required');
    });

    test('should require supplier bill number for return purchase invoices', async () => {
      const originalInvoice = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId: new mongoose.Types.ObjectId(),
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      const returnInvoice = new Invoice({
        type: 'return_purchase',
        originalInvoiceId: originalInvoice._id,
        supplierId: originalInvoice.supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(),
        returnMetadata: {
          returnReason: 'damaged',
          returnNotes: 'Damaged goods',
          returnDate: new Date()
        },
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: -5,
            unitPrice: 100,
            taxAmount: -90,
            lineTotal: -590
          }
        ],
        totals: {
          subtotal: -500,
          totalDiscount: 0,
          totalTax: -90,
          grandTotal: -590
        }
        // Missing supplierBillNo
      });

      await expect(returnInvoice.save()).rejects.toThrow('Supplier bill number is required');
    });

    test('should allow duplicate supplier bill number for different suppliers', async () => {
      const supplier1 = new mongoose.Types.ObjectId();
      const supplier2 = new mongoose.Types.ObjectId();

      const invoice1 = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId: supplier1,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      // Same bill number but different supplier should be allowed
      const invoice2 = new Invoice({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId: supplier2,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      await expect(invoice2.save()).resolves.toBeDefined();
    });

    test('should reject duplicate supplier bill number for same supplier', async () => {
      const supplierId = new mongoose.Types.ObjectId();

      const invoice1 = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      const invoice2 = new Invoice({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      await expect(invoice2.save()).rejects.toThrow('already exists for this supplier');
    });

    test('should allow duplicate bill number if first invoice is cancelled', async () => {
      const supplierId = new mongoose.Types.ObjectId();

      const invoice1 = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        status: 'cancelled',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      // Same bill number should be allowed since first is cancelled
      const invoice2 = new Invoice({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      await expect(invoice2.save()).resolves.toBeDefined();
    });

    test('should allow updating invoice with same bill number', async () => {
      const supplierId = new mongoose.Types.ObjectId();

      const invoice = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      // Update the same invoice
      invoice.status = 'confirmed';
      await expect(invoice.save()).resolves.toBeDefined();
    });

    test('should not validate bill number for sales invoices', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: new mongoose.Types.ObjectId(),
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
        // No supplierBillNo required for sales
      });

      await expect(invoice.save()).resolves.toBeDefined();
    });

    test('should include invoice details in error message', async () => {
      const supplierId = new mongoose.Types.ObjectId();

      const invoice1 = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      const invoice2 = new Invoice({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      try {
        await invoice2.save();
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('BILL001');
        expect(error.message).toContain(invoice1.invoiceNumber);
      }
    });

    test('should handle case-sensitive bill numbers', async () => {
      const supplierId = new mongoose.Types.ObjectId();

      const invoice1 = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      // Different case should be treated as different bill number
      const invoice2 = new Invoice({
        type: 'purchase',
        supplierBillNo: 'bill001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      // This should be allowed as it's a different case
      await expect(invoice2.save()).resolves.toBeDefined();
    });

    test('should validate on both new and existing invoices', async () => {
      const supplierId = new mongoose.Types.ObjectId();

      const invoice1 = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      const invoice2 = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL002',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      // Try to update invoice2 with duplicate bill number
      invoice2.supplierBillNo = 'BILL001';
      await expect(invoice2.save()).rejects.toThrow('already exists for this supplier');
    });

    test('should handle whitespace in bill numbers', async () => {
      const supplierId = new mongoose.Types.ObjectId();

      const invoice1 = await Invoice.create({
        type: 'purchase',
        supplierBillNo: 'BILL 001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      // Different whitespace should be treated as different
      const invoice2 = new Invoice({
        type: 'purchase',
        supplierBillNo: 'BILL001',
        supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        }
      });

      await expect(invoice2.save()).resolves.toBeDefined();
    });
  });
});
