const mongoose = require('mongoose');
const schemeTrackingService = require('../../src/services/schemeTrackingService');
const Item = require('../../src/models/Item');

// Mock dependencies
jest.mock('../../src/models/Item');
jest.mock('../../src/repositories/stockMovementRepository');

describe('Scheme Item Separation', () => {
  let testItems;
  let testInvoice;

  beforeEach(() => {
    jest.clearAllMocks();

    // Test items with various scheme configurations
    testItems = [
      {
        itemId: new mongoose.Types.ObjectId(),
        quantity: 12,
        unitPrice: 100,
        scheme1Quantity: 1, // Regular bonus
        scheme2Quantity: 0  // No claim bonus
      },
      {
        itemId: new mongoose.Types.ObjectId(),
        quantity: 24,
        unitPrice: 50,
        scheme1Quantity: 2,
        scheme2Quantity: 1  // Claim bonus
      },
      {
        itemId: new mongoose.Types.ObjectId(),
        quantity: 10,
        unitPrice: 200,
        scheme1Quantity: 0,
        scheme2Quantity: 0  // No schemes
      },
      {
        itemId: new mongoose.Types.ObjectId(),
        quantity: 5,
        unitPrice: 150,
        scheme1Quantity: 3,
        scheme2Quantity: 2  // All scheme items (no regular sales)
      }
    ];

    testInvoice = {
      _id: new mongoose.Types.ObjectId(),
      invoiceNumber: 'SI2024000001',
      type: 'sales',
      customerId: new mongoose.Types.ObjectId(),
      items: testItems
    };
  });

  describe('separateSchemeItems', () => {
    it('should separate regular items from scheme items correctly', () => {
      const result = schemeTrackingService.separateSchemeItems(testItems);

      expect(result).toHaveProperty('regularItems');
      expect(result).toHaveProperty('schemeItems');
      expect(result).toHaveProperty('inventoryImpactItems');
      expect(result).toHaveProperty('summary');

      // Check regular items (items with regular sales quantity)
      expect(result.regularItems).toHaveLength(3); // Items 0, 1, 2 have regular quantities
      expect(result.regularItems[0].quantity).toBe(11); // 12 - 1 (scheme1)
      expect(result.regularItems[1].quantity).toBe(21); // 24 - 2 - 1 (schemes)
      expect(result.regularItems[2].quantity).toBe(10); // No schemes

      // Check scheme items (items with scheme quantities)
      expect(result.schemeItems).toHaveLength(3); // Items 0, 1, 3 have schemes
      expect(result.schemeItems[0].scheme1Quantity).toBe(1);
      expect(result.schemeItems[1].scheme1Quantity).toBe(2);
      expect(result.schemeItems[1].scheme2Quantity).toBe(1);
      expect(result.schemeItems[2].scheme1Quantity).toBe(3);
      expect(result.schemeItems[2].scheme2Quantity).toBe(2);

      // Check inventory impact items (only regular items affect inventory)
      expect(result.inventoryImpactItems).toHaveLength(3);
      expect(result.inventoryImpactItems.every(item => item.affectsInventory)).toBe(true);

      // Check summary
      expect(result.summary.totalRegularQuantity).toBe(42); // 11 + 21 + 10
      expect(result.summary.totalSchemeQuantity).toBe(9); // 1 + 2 + 1 + 3 + 2
      expect(result.summary.totalInventoryImpact).toBe(42);
      expect(result.summary.itemsWithSchemes).toBe(3);
      expect(result.summary.regularItemsCount).toBe(3);
    });

    it('should handle items with only scheme quantities', () => {
      const schemeOnlyItems = [
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 5,
          unitPrice: 100,
          scheme1Quantity: 3,
          scheme2Quantity: 2 // Total scheme = total quantity
        }
      ];

      const result = schemeTrackingService.separateSchemeItems(schemeOnlyItems);

      expect(result.regularItems).toHaveLength(0); // No regular items
      expect(result.schemeItems).toHaveLength(1);
      expect(result.inventoryImpactItems).toHaveLength(0); // No inventory impact
      expect(result.summary.totalRegularQuantity).toBe(0);
      expect(result.summary.totalSchemeQuantity).toBe(5);
      expect(result.summary.totalInventoryImpact).toBe(0);
    });

    it('should handle items with no scheme quantities', () => {
      const regularOnlyItems = [
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 10,
          unitPrice: 100,
          scheme1Quantity: 0,
          scheme2Quantity: 0
        }
      ];

      const result = schemeTrackingService.separateSchemeItems(regularOnlyItems);

      expect(result.regularItems).toHaveLength(1);
      expect(result.schemeItems).toHaveLength(0); // No scheme items
      expect(result.inventoryImpactItems).toHaveLength(1);
      expect(result.summary.totalRegularQuantity).toBe(10);
      expect(result.summary.totalSchemeQuantity).toBe(0);
      expect(result.summary.totalInventoryImpact).toBe(10);
    });

    it('should mark items correctly with affectsInventory flag', () => {
      const result = schemeTrackingService.separateSchemeItems(testItems);

      // Regular items should affect inventory
      result.regularItems.forEach(item => {
        expect(item.affectsInventory).toBe(true);
        expect(item.itemType).toBe('regular');
      });

      // Scheme items should not affect inventory
      result.schemeItems.forEach(item => {
        expect(item.affectsInventory).toBe(false);
        expect(item.itemType).toBe('scheme');
      });
    });
  });

  describe('validateSchemeItemSeparation', () => {
    it('should validate correct scheme quantities', () => {
      const result = schemeTrackingService.validateSchemeItemSeparation(testItems);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(4);
      expect(result.summary.itemsWithSchemes).toBe(3);
    });

    it('should detect scheme quantities exceeding total quantities', () => {
      const invalidItems = [
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 10,
          unitPrice: 100,
          scheme1Quantity: 8,
          scheme2Quantity: 5 // Total scheme (13) > total quantity (10)
        }
      ];

      const result = schemeTrackingService.validateSchemeItemSeparation(invalidItems);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('SCHEME_EXCEEDS_TOTAL');
      expect(result.errors[0].totalQuantity).toBe(10);
      expect(result.errors[0].schemeQuantity).toBe(13);
    });

    it('should detect negative scheme quantities', () => {
      const invalidItems = [
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 10,
          unitPrice: 100,
          scheme1Quantity: -2, // Negative
          scheme2Quantity: -1  // Negative
        }
      ];

      const result = schemeTrackingService.validateSchemeItemSeparation(invalidItems);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.error === 'NEGATIVE_SCHEME1')).toBe(true);
      expect(result.errors.some(e => e.error === 'NEGATIVE_SCHEME2')).toBe(true);
    });

    it('should generate warnings for scheme-only items', () => {
      const schemeOnlyItems = [
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 5,
          unitPrice: 100,
          scheme1Quantity: 3,
          scheme2Quantity: 2 // Total scheme = total quantity
        }
      ];

      const result = schemeTrackingService.validateSchemeItemSeparation(schemeOnlyItems);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(2); // SCHEME_ONLY_ITEM + HIGH_SCHEME_PERCENTAGE
      expect(result.warnings.some(w => w.warning === 'SCHEME_ONLY_ITEM')).toBe(true);
      expect(result.warnings.some(w => w.warning === 'HIGH_SCHEME_PERCENTAGE')).toBe(true);
    });

    it('should generate warnings for high scheme percentages', () => {
      const highSchemeItems = [
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 10,
          unitPrice: 100,
          scheme1Quantity: 6,
          scheme2Quantity: 0 // 60% scheme
        }
      ];

      const result = schemeTrackingService.validateSchemeItemSeparation(highSchemeItems);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].warning).toBe('HIGH_SCHEME_PERCENTAGE');
      expect(result.warnings[0].schemePercentage).toBe(60);
    });
  });

  describe('processItemsForInventoryImpact', () => {
    it('should process items correctly for inventory management', () => {
      const result = schemeTrackingService.processItemsForInventoryImpact(testItems);

      expect(result).toHaveProperty('inventoryItems');
      expect(result).toHaveProperty('schemeItems');
      expect(result).toHaveProperty('regularItems');
      expect(result).toHaveProperty('validation');
      expect(result).toHaveProperty('summary');

      expect(result.inventoryItems).toHaveLength(3); // Only regular items
      expect(result.schemeItems).toHaveLength(3); // Items with schemes
      expect(result.validation.valid).toBe(true);
    });

    it('should throw error for invalid scheme quantities', () => {
      const invalidItems = [
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 5,
          unitPrice: 100,
          scheme1Quantity: 8, // Exceeds total
          scheme2Quantity: 0
        }
      ];

      expect(() => {
        schemeTrackingService.processItemsForInventoryImpact(invalidItems);
      }).toThrow('Scheme validation failed');
    });
  });

  describe('updateInventoryWithSchemeAwareness', () => {
    beforeEach(() => {
      // Mock Item.findById
      const mockItems = {
        [testItems[0].itemId]: { 
          _id: testItems[0].itemId,
          inventory: { currentStock: 100 },
          save: jest.fn().mockResolvedValue(true)
        },
        [testItems[1].itemId]: { 
          _id: testItems[1].itemId,
          inventory: { currentStock: 200 },
          save: jest.fn().mockResolvedValue(true)
        },
        [testItems[2].itemId]: { 
          _id: testItems[2].itemId,
          inventory: { currentStock: 50 },
          save: jest.fn().mockResolvedValue(true)
        }
      };

      Item.findById.mockImplementation((id) => {
        return Promise.resolve(mockItems[id.toString()]);
      });
    });

    it('should update inventory only for regular items', async () => {
      const result = await schemeTrackingService.updateInventoryWithSchemeAwareness(testItems, 'subtract');

      expect(result.inventoryUpdates).toHaveLength(3); // Only regular items updated
      expect(result.schemeItemsTracked).toHaveLength(3); // Scheme items tracked but not updated
      
      // Check inventory updates
      expect(result.inventoryUpdates[0].quantityChanged).toBe(11); // 12 - 1 scheme
      expect(result.inventoryUpdates[1].quantityChanged).toBe(21); // 24 - 3 schemes
      expect(result.inventoryUpdates[2].quantityChanged).toBe(10); // No schemes

      // Check scheme items tracking
      expect(result.schemeItemsTracked[0].scheme1Quantity).toBe(1);
      expect(result.schemeItemsTracked[1].scheme1Quantity).toBe(2);
      expect(result.schemeItemsTracked[1].scheme2Quantity).toBe(1);
      expect(result.schemeItemsTracked[2].totalSchemeQuantity).toBe(5);

      // Check summary
      expect(result.summary.itemsUpdated).toBe(3);
      expect(result.summary.schemeItemsSkipped).toBe(3);
      expect(result.summary.totalRegularQuantity).toBe(42);
      expect(result.summary.totalSchemeQuantity).toBe(9);
    });

    it('should handle add operation correctly', async () => {
      const result = await schemeTrackingService.updateInventoryWithSchemeAwareness(testItems, 'add');

      expect(result.inventoryUpdates).toHaveLength(3);
      result.inventoryUpdates.forEach(update => {
        expect(update.operation).toBe('add');
      });
    });

    it('should throw error for non-existent items', async () => {
      Item.findById.mockResolvedValueOnce(null);

      await expect(
        schemeTrackingService.updateInventoryWithSchemeAwareness(testItems, 'subtract')
      ).rejects.toThrow('Item not found');
    });

    it('should not allow negative inventory', async () => {
      // Mock item with low stock
      const lowStockItem = {
        _id: testItems[0].itemId,
        inventory: { currentStock: 5 }, // Less than required
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById.mockResolvedValueOnce(lowStockItem);

      const result = await schemeTrackingService.updateInventoryWithSchemeAwareness([testItems[0]], 'subtract');

      expect(lowStockItem.inventory.currentStock).toBe(0); // Should not go negative
      expect(result.inventoryUpdates[0].newStock).toBe(0);
    });
  });

  describe('createSchemeAwareStockMovements', () => {
    beforeEach(() => {
      const mockStockMovementRepository = require('../../src/repositories/stockMovementRepository');
      mockStockMovementRepository.create = jest.fn().mockImplementation((data) => 
        Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data })
      );
    });

    it('should create stock movements only for regular items', async () => {
      const result = await schemeTrackingService.createSchemeAwareStockMovements(
        testInvoice,
        new mongoose.Types.ObjectId(),
        'out'
      );

      expect(result.stockMovements).toHaveLength(3); // Only regular items
      expect(result.schemeAuditLog.schemeItems).toHaveLength(3); // Scheme items logged
      
      // Check stock movements
      result.stockMovements.forEach(movement => {
        expect(movement.movementType).toBe('out');
        expect(movement.referenceType).toBe('sales_invoice');
        expect(movement.metadata.itemType).toBe('regular');
        expect(movement.metadata.excludesSchemes).toBe(true);
      });

      // Check scheme audit log
      expect(result.schemeAuditLog.invoiceId).toBe(testInvoice._id);
      expect(result.schemeAuditLog.schemeItems[0].scheme1Quantity).toBe(1);
      expect(result.schemeAuditLog.schemeItems[1].scheme1Quantity).toBe(2);
      expect(result.schemeAuditLog.schemeItems[1].scheme2Quantity).toBe(1);

      // Check summary
      expect(result.summary.movementsCreated).toBe(3);
      expect(result.summary.schemeItemsLogged).toBe(3);
    });

    it('should handle return operations', async () => {
      const result = await schemeTrackingService.createSchemeAwareStockMovements(
        testInvoice,
        new mongoose.Types.ObjectId(),
        'in'
      );

      result.stockMovements.forEach(movement => {
        expect(movement.movementType).toBe('in');
        expect(movement.notes).toContain('Return invoice');
      });
    });

    it('should include metadata about scheme quantities', async () => {
      const result = await schemeTrackingService.createSchemeAwareStockMovements(
        testInvoice,
        new mongoose.Types.ObjectId(),
        'out'
      );

      const firstMovement = result.stockMovements[0];
      expect(firstMovement.metadata.schemeQuantities.scheme1).toBe(1);
      expect(firstMovement.metadata.schemeQuantities.scheme2).toBe(0);
      expect(firstMovement.metadata.originalQuantity).toBe(12);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle mixed items with various scheme configurations', () => {
      const mixedItems = [
        // Regular item only
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 10,
          unitPrice: 100,
          scheme1Quantity: 0,
          scheme2Quantity: 0
        },
        // Item with scheme1 only
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 15,
          unitPrice: 50,
          scheme1Quantity: 2,
          scheme2Quantity: 0
        },
        // Item with both schemes
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 20,
          unitPrice: 75,
          scheme1Quantity: 1,
          scheme2Quantity: 1
        },
        // Scheme-only item
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 3,
          unitPrice: 200,
          scheme1Quantity: 2,
          scheme2Quantity: 1
        }
      ];

      const result = schemeTrackingService.separateSchemeItems(mixedItems);

      expect(result.regularItems).toHaveLength(3); // First 3 have regular quantities
      expect(result.schemeItems).toHaveLength(3); // Last 3 have scheme quantities
      expect(result.inventoryImpactItems).toHaveLength(3); // Only regular items affect inventory
      
      expect(result.summary.totalRegularQuantity).toBe(41); // 10 + 13 + 18 + 0
      expect(result.summary.totalSchemeQuantity).toBe(7); // 0 + 2 + 2 + 3
      expect(result.summary.totalInventoryImpact).toBe(41);
    });

    it('should maintain data integrity across all operations', () => {
      const items = testItems;
      
      // Test separation
      const separation = schemeTrackingService.separateSchemeItems(items);
      
      // Test validation
      const validation = schemeTrackingService.validateSchemeItemSeparation(items);
      
      // Test processing
      const processing = schemeTrackingService.processItemsForInventoryImpact(items);

      // Verify consistency
      expect(separation.summary.totalRegularQuantity).toBe(processing.summary.totalRegularQuantity);
      expect(separation.summary.totalSchemeQuantity).toBe(processing.summary.totalSchemeQuantity);
      expect(validation.summary.itemsWithSchemes).toBe(separation.summary.itemsWithSchemes);
      
      // Verify total quantities match
      const originalTotal = items.reduce((sum, item) => sum + item.quantity, 0);
      const separatedTotal = separation.summary.totalRegularQuantity + separation.summary.totalSchemeQuantity;
      expect(originalTotal).toBe(separatedTotal);
    });
  });
});