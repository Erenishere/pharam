const Batch = require('../models/Batch');
const Item = require('../models/Item');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');

function generateBatchNumber(prefix, index) {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}${year}${month}${String(index).padStart(4, '0')}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

async function createBatches() {
  const items = await Item.find({});
  const warehouses = await Warehouse.find({});
  const suppliers = await Supplier.find({});

  if (items.length === 0 || warehouses.length === 0) {
    console.log('  - No items or warehouses found. Please seed items and warehouses first.');
    return [];
  }

  const batches = [];
  const now = new Date();
  let batchIndex = 1;

  for (const item of items) {
    for (const warehouse of warehouses) {
      const supplier = suppliers.length > 0 ? suppliers[Math.floor(Math.random() * suppliers.length)] : null;

      batches.push({
        batchNumber: generateBatchNumber('BTH', batchIndex++),
        item: item._id,
        warehouse: warehouse._id,
        supplier: supplier?._id,
        manufacturingDate: addMonths(now, -6),
        expiryDate: addMonths(now, 18),
        quantity: 500,
        remainingQuantity: 450,
        unitCost: item.pricing?.costPrice || 100,
        totalCost: 500 * (item.pricing?.costPrice || 100),
        status: 'active',
        notes: `Regular stock batch for ${item.name}`,
        referenceType: 'PURCHASE_ORDER',
        referenceNumber: `PO-${Date.now()}-${batchIndex}`,
      });

      batches.push({
        batchNumber: generateBatchNumber('BTH', batchIndex++),
        item: item._id,
        warehouse: warehouse._id,
        supplier: supplier?._id,
        manufacturingDate: addMonths(now, -3),
        expiryDate: addMonths(now, 24),
        quantity: 300,
        remainingQuantity: 300,
        unitCost: item.pricing?.costPrice || 100,
        totalCost: 300 * (item.pricing?.costPrice || 100),
        status: 'active',
        notes: `Fresh stock batch for ${item.name}`,
        referenceType: 'PURCHASE_ORDER',
        referenceNumber: `PO-${Date.now()}-${batchIndex}`,
      });

      batches.push({
        batchNumber: generateBatchNumber('EXP', batchIndex++),
        item: item._id,
        warehouse: warehouse._id,
        supplier: supplier?._id,
        manufacturingDate: addMonths(now, -12),
        expiryDate: addDays(now, 15),
        quantity: 100,
        remainingQuantity: 75,
        unitCost: item.pricing?.costPrice || 100,
        totalCost: 100 * (item.pricing?.costPrice || 100),
        status: 'active',
        notes: `EXPIRING SOON - ${item.name}`,
        referenceType: 'PURCHASE_ORDER',
        referenceNumber: `PO-${Date.now()}-${batchIndex}`,
      });

      batches.push({
        batchNumber: generateBatchNumber('EXP', batchIndex++),
        item: item._id,
        warehouse: warehouse._id,
        supplier: supplier?._id,
        manufacturingDate: addMonths(now, -18),
        expiryDate: addDays(now, -10),
        quantity: 50,
        remainingQuantity: 30,
        unitCost: item.pricing?.costPrice || 100,
        totalCost: 50 * (item.pricing?.costPrice || 100),
        status: 'expired',
        notes: `EXPIRED batch - needs disposal`,
        referenceType: 'PURCHASE_ORDER',
        referenceNumber: `PO-${Date.now()}-${batchIndex}`,
      });

      batches.push({
        batchNumber: generateBatchNumber('DPL', batchIndex++),
        item: item._id,
        warehouse: warehouse._id,
        supplier: supplier?._id,
        manufacturingDate: addMonths(now, -9),
        expiryDate: addMonths(now, 12),
        quantity: 200,
        remainingQuantity: 0,
        unitCost: item.pricing?.costPrice || 100,
        totalCost: 200 * (item.pricing?.costPrice || 100),
        status: 'depleted',
        notes: `Fully consumed batch`,
        referenceType: 'PURCHASE_ORDER',
        referenceNumber: `PO-${Date.now()}-${batchIndex}`,
      });

      batches.push({
        batchNumber: generateBatchNumber('QRT', batchIndex++),
        item: item._id,
        warehouse: warehouse._id,
        supplier: supplier?._id,
        manufacturingDate: addMonths(now, -2),
        expiryDate: addMonths(now, 22),
        quantity: 100,
        remainingQuantity: 100,
        unitCost: item.pricing?.costPrice || 100,
        totalCost: 100 * (item.pricing?.costPrice || 100),
        status: 'quarantined',
        notes: `Quality check pending - DO NOT USE`,
        referenceType: 'OTHER',
        referenceNumber: `QC-${Date.now()}-${batchIndex}`,
      });
    }
  }

  if (items.length > 0 && warehouses.length > 0) {
    const firstItem = items[0];
    const firstWarehouse = warehouses[0];
    const supplier = suppliers.length > 0 ? suppliers[0] : null;

    for (let i = 0; i < 5; i++) {
      batches.push({
        batchNumber: generateBatchNumber('EXW', batchIndex++),
        item: firstItem._id,
        warehouse: firstWarehouse._id,
        supplier: supplier?._id,
        manufacturingDate: addMonths(now, -14),
        expiryDate: addDays(now, 7 + i * 5),
        quantity: 80 + i * 10,
        remainingQuantity: 50 + i * 5,
        unitCost: firstItem.pricing?.costPrice || 100,
        totalCost: (80 + i * 10) * (firstItem.pricing?.costPrice || 100),
        status: 'active',
        notes: `Expiring in ${7 + i * 5} days - Urgent sale needed`,
        referenceType: 'PURCHASE_ORDER',
        referenceNumber: `PO-URGENT-${batchIndex}`,
      });
    }

    for (let i = 1; i <= 3; i++) {
      batches.push({
        batchNumber: generateBatchNumber('LOW', batchIndex++),
        item: items[Math.min(i, items.length - 1)]._id,
        warehouse: firstWarehouse._id,
        supplier: supplier?._id,
        manufacturingDate: addMonths(now, -4),
        expiryDate: addMonths(now, 8),
        quantity: 50,
        remainingQuantity: 5 + i,
        unitCost: items[Math.min(i, items.length - 1)].pricing?.costPrice || 100,
        totalCost: 50 * (items[Math.min(i, items.length - 1)].pricing?.costPrice || 100),
        status: 'active',
        notes: `Low stock batch - reorder needed`,
        referenceType: 'PURCHASE_ORDER',
        referenceNumber: `PO-LOW-${batchIndex}`,
      });
    }
  }

  return batches;
}

module.exports = {
  async seed() {
    await Batch.deleteMany({});
    
    const batches = await createBatches();
    
    if (batches.length === 0) {
      console.log('  - No batches created (missing dependencies)');
      return;
    }

    const createdBatches = await Batch.insertMany(batches, { ordered: false }).catch(err => {
      if (err.insertedDocs) {
        return err.insertedDocs;
      }
      console.log(`  - Batch insert error: ${err.message}`);
      return [];
    });

    console.log(`  - Created ${createdBatches.length} batches`);
    
    const stats = {
      active: createdBatches.filter(b => b.status === 'active').length,
      expired: createdBatches.filter(b => b.status === 'expired').length,
      depleted: createdBatches.filter(b => b.status === 'depleted').length,
      quarantined: createdBatches.filter(b => b.status === 'quarantined').length,
    };
    console.log(`    Active: ${stats.active}, Expired: ${stats.expired}, Depleted: ${stats.depleted}, Quarantined: ${stats.quarantined}`);

    const expiringSoon = createdBatches.filter(b => {
      const daysUntilExpiry = Math.ceil((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30 && b.status === 'active';
    });
    console.log(`    Expiring within 30 days: ${expiringSoon.length}`);
  },

  async clear() {
    await Batch.deleteMany({});
    console.log('  - Batches cleared');
  },
};
