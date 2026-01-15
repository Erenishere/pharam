const taxService = require('../../src/services/taxService');
const taxConfigRepository = require('../../src/repositories/taxConfigRepository');

// Mock the repository
jest.mock('../../src/repositories/taxConfigRepository');

describe('Tax Calculation Engine - Advanced Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    taxService.clearCache();
  });

  describe('Pakistani GST Calculations', () => {
    it('should calculate standard GST at 18%', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST rate for Pakistan',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const result = await taxService.calculateGST(10000, 'GST18', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxableAmount).toBe(10000);
      expect(result.taxAmount).toBe(1800);
      expect(result.grossAmount).toBe(11800);
      expect(result.taxType).toBe('GST');
    });

    it('should calculate reduced GST at 17%', async () => {
      const gstConfig = {
        code: 'GST17',
        name: 'GST 17%',
        type: 'GST',
        rate: 0.17,
        description: 'Reduced GST rate',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const result = await taxService.calculateGST(10000, 'GST17', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBeCloseTo(1700, 1);
      expect(result.grossAmount).toBeCloseTo(11700, 1);
    });

    it('should calculate GST on discounted amount', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const item = {
        unitPrice: 1000,
        quantity: 10,
        taxCodes: 'GST18',
        taxInclusive: false,
        discount: 20, // 20% discount
      };

      const result = await taxService.calculateItemTax(item);

      expect(result.subtotal).toBe(10000);
      expect(result.discountAmount).toBe(2000);
      expect(result.taxableAmount).toBe(8000);
      expect(result.taxAmount).toBe(1440); // 18% of 8000
      expect(result.lineTotal).toBe(9440);
    });
  });

  describe('Pakistani WHT Calculations', () => {
    it('should calculate standard WHT at 4%', async () => {
      const whtConfig = {
        code: 'WHT4',
        name: 'WHT 4%',
        type: 'WHT',
        rate: 0.04,
        description: 'Standard Withholding Tax',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(whtConfig);

      const result = await taxService.calculateWHT(10000, 'WHT4', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxableAmount).toBe(10000);
      expect(result.taxAmount).toBe(400);
      expect(result.grossAmount).toBe(10400);
      expect(result.taxType).toBe('WHT');
    });

    it('should calculate WHT for services at 8%', async () => {
      const whtConfig = {
        code: 'WHT_SERVICES',
        name: 'WHT Services 8%',
        type: 'WHT',
        rate: 0.08,
        description: 'Withholding Tax for Services',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(whtConfig);

      const result = await taxService.calculateWHT(50000, 'WHT_SERVICES', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(4000);
      expect(result.grossAmount).toBe(54000);
    });
  });

  describe('Combined GST and WHT Calculations', () => {
    it('should calculate both GST and WHT correctly', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      const whtConfig = {
        code: 'WHT4',
        name: 'WHT 4%',
        type: 'WHT',
        rate: 0.04,
        isActive: true,
      };

      taxConfigRepository.findByCode
        .mockResolvedValueOnce(gstConfig)
        .mockResolvedValueOnce(whtConfig);

      const result = await taxService.calculateGSTAndWHT(100000, 'GST18', 'WHT4', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxableAmount).toBe(100000);
      expect(result.breakdown[0].amount).toBe(18000); // GST
      expect(result.breakdown[1].amount).toBe(4000); // WHT
      expect(result.taxAmount).toBe(22000);
      expect(result.grossAmount).toBe(122000);
    });

    it('should handle inclusive pricing with GST and WHT', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      const whtConfig = {
        code: 'WHT4',
        name: 'WHT 4%',
        type: 'WHT',
        rate: 0.04,
        isActive: true,
      };

      taxConfigRepository.findByCode
        .mockResolvedValueOnce(gstConfig)
        .mockResolvedValueOnce(whtConfig);

      const result = await taxService.calculateGSTAndWHT(122000, 'GST18', 'WHT4', {
        isInclusive: true,
        quantity: 1,
      });

      expect(result.taxableAmount).toBeCloseTo(100000, 0);
      expect(result.grossAmount).toBe(122000);
    });
  });

  describe('Complex Invoice Scenarios', () => {
    it('should calculate taxes for invoice with mixed items', async () => {
      const gst18Config = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      const gst17Config = {
        code: 'GST17',
        name: 'GST 17%',
        type: 'GST',
        rate: 0.17,
        isActive: true,
      };

      taxConfigRepository.findByCode
        .mockResolvedValueOnce(gst18Config)
        .mockResolvedValueOnce(gst17Config);

      const items = [
        {
          unitPrice: 1000,
          quantity: 5,
          taxCodes: 'GST18',
          taxInclusive: false,
          discount: 0,
        },
        {
          unitPrice: 2000,
          quantity: 3,
          taxCodes: 'GST17',
          taxInclusive: false,
          discount: 10,
        },
      ];

      const result = await taxService.calculateInvoiceTaxes(items);

      // Item 1: 5000 + 900 (18% GST) = 5900
      // Item 2: 6000 - 600 (discount) = 5400 + 918 (17% GST) = 6318
      expect(result.totalSubtotal).toBe(11000);
      expect(result.totalDiscount).toBe(600);
      expect(result.totalTaxableAmount).toBe(10400);
      expect(result.totalTaxAmount).toBeCloseTo(1818, 0);
      expect(result.totalGrossAmount).toBeCloseTo(12218, 0);
    });

    it('should calculate taxes for invoice with GST and WHT on items', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
        metadata: { compoundTax: false },
      };

      const whtConfig = {
        code: 'WHT4',
        name: 'WHT 4%',
        type: 'WHT',
        rate: 0.04,
        isActive: true,
        metadata: { compoundTax: false },
      };

      taxConfigRepository.findByCode
        .mockResolvedValueOnce(gstConfig)
        .mockResolvedValueOnce(whtConfig);

      const items = [
        {
          unitPrice: 10000,
          quantity: 1,
          taxCodes: ['GST18', 'WHT4'],
          taxInclusive: false,
          discount: 0,
        },
      ];

      const result = await taxService.calculateInvoiceTaxes(items);

      expect(result.totalTaxableAmount).toBe(10000);
      expect(result.totalTaxAmount).toBe(2200); // 1800 + 400
      expect(result.totalGrossAmount).toBe(12200);
      expect(result.taxSummary).toHaveLength(2);
    });
  });

  describe('Edge Cases and Validations', () => {
    it('should handle zero amount', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const result = await taxService.calculateTax(0, 'GST18', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });

    it('should handle very small amounts with precision', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const result = await taxService.calculateTax(0.01, 'GST18', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBeCloseTo(0.0018, 4);
      expect(result.grossAmount).toBeCloseTo(0.0118, 4);
    });

    it('should handle large amounts', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const result = await taxService.calculateTax(10000000, 'GST18', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(1800000);
      expect(result.grossAmount).toBe(11800000);
    });

    it('should handle 100% discount correctly', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const item = {
        unitPrice: 1000,
        quantity: 10,
        taxCodes: 'GST18',
        taxInclusive: false,
        discount: 100,
      };

      const result = await taxService.calculateItemTax(item);

      expect(result.discountAmount).toBe(10000);
      expect(result.taxableAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.lineTotal).toBe(0);
    });

    it('should calculate correctly with fractional quantities', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const result = await taxService.calculateTax(100, 'GST18', {
        isInclusive: false,
        quantity: 2.5,
      });

      expect(result.totalTaxableAmount).toBe(250);
      expect(result.totalTaxAmount).toBe(45);
      expect(result.totalGrossAmount).toBe(295);
    });
  });

  describe('SRB/FBR Compliance Scenarios', () => {
    it('should calculate taxes for SRB compliant transaction', async () => {
      const srbGstConfig = {
        code: 'SRB_GST',
        name: 'SRB GST',
        type: 'GST',
        rate: 0.13,
        description: 'Sindh Revenue Board GST',
        isActive: true,
        metadata: {
          srbCompliant: true,
          fbrCompliant: false,
        },
      };

      taxConfigRepository.findByCode.mockResolvedValue(srbGstConfig);

      const result = await taxService.calculateTax(10000, 'SRB_GST', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(1300);
      expect(result.grossAmount).toBe(11300);
    });

    it('should calculate taxes for FBR compliant transaction', async () => {
      const fbrGstConfig = {
        code: 'FBR_GST',
        name: 'FBR GST',
        type: 'GST',
        rate: 0.18,
        description: 'Federal Board of Revenue GST',
        isActive: true,
        metadata: {
          srbCompliant: false,
          fbrCompliant: true,
        },
      };

      taxConfigRepository.findByCode.mockResolvedValue(fbrGstConfig);

      const result = await taxService.calculateTax(10000, 'FBR_GST', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(1800);
      expect(result.grossAmount).toBe(11800);
    });
  });

  describe('Multi-Currency Tax Calculations', () => {
    it('should calculate taxes in PKR', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      // Amount in PKR
      const result = await taxService.calculateTax(100000, 'GST18', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(18000);
      expect(result.grossAmount).toBe(118000);
    });

    it('should handle decimal amounts for foreign currency conversions', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      // Amount converted from USD to PKR (e.g., $100 * 278.50 PKR)
      const result = await taxService.calculateTax(27850, 'GST18', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(5013);
      expect(result.grossAmount).toBe(32863);
    });
  });
});
