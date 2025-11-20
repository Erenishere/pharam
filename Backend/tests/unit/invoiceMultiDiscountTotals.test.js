const salesInvoiceService = require('../../src/services/salesInvoiceService');

describe('Invoice Totals - Multi-Level Discounts', () => {
  describe('calculateInvoiceTotals', () => {
    test('should calculate totals with discount1 only', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount1Amount: 100,
          discount2Amount: 0,
          taxAmount: 162,
          lineTotal: 1062
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(1000);
      expect(totals.totalDiscount1).toBe(100);
      expect(totals.totalDiscount2).toBe(0);
      expect(totals.totalDiscount).toBe(100);
      expect(totals.totalTax).toBe(162);
      expect(totals.grandTotal).toBe(1062);
    });

    test('should calculate totals with both discount1 and discount2', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount1Amount: 100, // 10% of 1000
          discount2Amount: 45,  // 5% of 900
          taxAmount: 153.9,     // 18% of 855
          lineTotal: 1008.9
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(1000);
      expect(totals.totalDiscount1).toBe(100);
      expect(totals.totalDiscount2).toBe(45);
      expect(totals.totalDiscount).toBe(145);
      expect(totals.totalTax).toBe(153.9);
      expect(totals.grandTotal).toBeCloseTo(1008.9, 1);
    });

    test('should calculate totals for multiple items with different discounts', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount1Amount: 100,
          discount2Amount: 45,
          taxAmount: 153.9,
          lineTotal: 1008.9
        },
        {
          itemId: 'item2',
          quantity: 5,
          unitPrice: 200,
          discount1Amount: 50,  // 5% of 1000
          discount2Amount: 0,
          taxAmount: 171,       // 18% of 950
          lineTotal: 1121
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(2000);
      expect(totals.totalDiscount1).toBe(150);
      expect(totals.totalDiscount2).toBe(45);
      expect(totals.totalDiscount).toBe(195);
      expect(totals.totalTax).toBeCloseTo(324.9, 1);
      expect(totals.grandTotal).toBeCloseTo(2129.9, 1);
    });

    test('should handle items with no discounts', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount1Amount: 0,
          discount2Amount: 0,
          taxAmount: 180,
          lineTotal: 1180
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(1000);
      expect(totals.totalDiscount1).toBe(0);
      expect(totals.totalDiscount2).toBe(0);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.totalTax).toBe(180);
      expect(totals.grandTotal).toBe(1180);
    });

    test('should handle legacy single discount format', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount: 10, // Legacy format
          taxAmount: 162,
          lineTotal: 1062
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(1000);
      expect(totals.totalDiscount1).toBe(100);
      expect(totals.totalDiscount2).toBe(0);
      expect(totals.totalDiscount).toBe(100);
      expect(totals.totalTax).toBe(162);
      expect(totals.grandTotal).toBe(1062);
    });

    test('should handle mixed legacy and new discount formats', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount: 10, // Legacy format
          taxAmount: 162,
          lineTotal: 1062
        },
        {
          itemId: 'item2',
          quantity: 5,
          unitPrice: 200,
          discount1Amount: 50,
          discount2Amount: 47.5,
          taxAmount: 162.45,
          lineTotal: 1064.95
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(2000);
      expect(totals.totalDiscount1).toBe(150);
      expect(totals.totalDiscount2).toBe(47.5);
      expect(totals.totalDiscount).toBe(197.5);
      expect(totals.totalTax).toBeCloseTo(324.45, 2);
      expect(totals.grandTotal).toBeCloseTo(2126.95, 2);
    });

    test('should calculate discount1 on line subtotal', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 12,
          unitPrice: 85.50,
          discount1Amount: 102.6, // 10% of 1026
          discount2Amount: 0,
          taxAmount: 165.67,
          lineTotal: 1089.07
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(1026);
      expect(totals.totalDiscount1).toBe(102.6);
    });

    test('should calculate discount2 on amount after discount1', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount1Amount: 200, // 20% of 1000 = 200
          discount2Amount: 80,  // 10% of 800 = 80
          taxAmount: 129.6,     // 18% of 720
          lineTotal: 849.6
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(1000);
      expect(totals.totalDiscount1).toBe(200);
      expect(totals.totalDiscount2).toBe(80);
      expect(totals.totalDiscount).toBe(280);
      expect(totals.totalTax).toBe(129.6);
      expect(totals.grandTotal).toBe(849.6);
    });

    test('should handle decimal discount amounts', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 13,
          unitPrice: 77.77,
          discount1Amount: 75.75,
          discount2Amount: 77.69,
          taxAmount: 145.23,
          lineTotal: 952.33
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBeCloseTo(1011.01, 2);
      expect(totals.totalDiscount1).toBeCloseTo(75.75, 2);
      expect(totals.totalDiscount2).toBeCloseTo(77.69, 2);
      expect(totals.totalDiscount).toBeCloseTo(153.44, 2);
      expect(totals.totalTax).toBeCloseTo(145.23, 2);
      expect(totals.grandTotal).toBeCloseTo(1002.8, 2);
    });

    test('should handle large invoice with many items', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        itemId: `item${i}`,
        quantity: 10,
        unitPrice: 100,
        discount1Amount: 100,
        discount2Amount: 45,
        taxAmount: 153.9,
        lineTotal: 1008.9
      }));

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(50000);
      expect(totals.totalDiscount1).toBe(5000);
      expect(totals.totalDiscount2).toBe(2250);
      expect(totals.totalDiscount).toBe(7250);
      expect(totals.totalTax).toBeCloseTo(7695, 1);
      expect(totals.grandTotal).toBeCloseTo(50445, 1);
    });

    test('should handle zero quantity items', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 0,
          unitPrice: 100,
          discount1Amount: 0,
          discount2Amount: 0,
          taxAmount: 0,
          lineTotal: 0
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(0);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.grandTotal).toBe(0);
    });

    test('should handle items with missing tax amount', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount1Amount: 100,
          discount2Amount: 45,
          // taxAmount missing
          lineTotal: 855
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(1000);
      expect(totals.totalDiscount).toBe(145);
      expect(totals.totalTax).toBe(0);
      expect(totals.grandTotal).toBe(855);
    });
  });

  describe('Discount calculation order', () => {
    test('should apply discount1 before discount2', () => {
      // Example: 1000 with 10% discount1 and 5% discount2
      // discount1: 1000 * 10% = 100, remaining = 900
      // discount2: 900 * 5% = 45, remaining = 855
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount1Amount: 100,
          discount2Amount: 45,
          taxAmount: 0,
          lineTotal: 855
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      // Total discount should be 145, not 150 (which would be if both applied to original)
      expect(totals.totalDiscount).toBe(145);
      expect(totals.grandTotal).toBe(855);
    });

    test('should demonstrate sequential discount is less than combined', () => {
      // Sequential: 10% then 5% = 14.5% effective
      // Combined: 15% would give 150 discount
      const items = [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount1Amount: 100,
          discount2Amount: 45,
          taxAmount: 0,
          lineTotal: 855
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.totalDiscount).toBe(145); // Not 150
      expect(totals.totalDiscount).toBeLessThan(150);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty items array', () => {
      const items = [];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(0);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.totalTax).toBe(0);
      expect(totals.grandTotal).toBe(0);
    });

    test('should handle very small amounts', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 1,
          unitPrice: 0.01,
          discount1Amount: 0.001,
          discount2Amount: 0.0005,
          taxAmount: 0.0016,
          lineTotal: 0.0101
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBeCloseTo(0.01, 4);
      expect(totals.totalDiscount).toBeCloseTo(0.0015, 4);
      expect(totals.grandTotal).toBeCloseTo(0.0101, 4);
    });

    test('should handle very large amounts', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 10000,
          unitPrice: 10000,
          discount1Amount: 10000000,
          discount2Amount: 9000000,
          taxAmount: 16200000,
          lineTotal: 97200000
        }
      ];

      const totals = salesInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(100000000);
      expect(totals.totalDiscount).toBe(19000000);
      expect(totals.grandTotal).toBe(97200000);
    });
  });
});
