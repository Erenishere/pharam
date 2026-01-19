require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharam';

async function seedBatches() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Item = require('./models/Item');
    const Warehouse = require('./models/Warehouse');
    const Supplier = require('./models/Supplier');
    const Batch = require('./models/Batch');

    const warehouses = [
      { code: 'WH0001', name: 'Main Warehouse - Karachi', location: { address: '123 Industrial Area', city: 'Karachi', state: 'Sindh', country: 'Pakistan', postalCode: '75700' }, contact: { phone: '+92-21-1234567', email: 'main@pharma.com' }, isActive: true, capacity: 10000 },
      { code: 'WH0002', name: 'Branch Warehouse - Lahore', location: { address: '45 Sundar Estate', city: 'Lahore', state: 'Punjab', country: 'Pakistan', postalCode: '54000' }, contact: { phone: '+92-42-9876543', email: 'lahore@pharma.com' }, isActive: true, capacity: 8000 },
      { code: 'WH0003', name: 'Branch Warehouse - Islamabad', location: { address: '78 I-9 Industrial', city: 'Islamabad', state: 'ICT', country: 'Pakistan', postalCode: '44000' }, contact: { phone: '+92-51-5555555', email: 'isb@pharma.com' }, isActive: true, capacity: 5000 },
    ];

    await Warehouse.deleteMany({});
    const createdWarehouses = await Warehouse.insertMany(warehouses);
    console.log(`Created ${createdWarehouses.length} warehouses`);

    const items = await Item.find({});
    const suppliers = await Supplier.find({});
    
    if (items.length === 0) {
      console.log('No items found. Please seed items first.');
      process.exit(1);
    }

    const now = new Date();
    const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
    const addMonths = (d, months) => { const r = new Date(d); r.setMonth(r.getMonth() + months); return r; };

    const batches = [];
    let idx = 1;

    for (const item of items) {
      for (const wh of createdWarehouses) {
        const supplier = suppliers.length > 0 ? suppliers[Math.floor(Math.random() * suppliers.length)]._id : null;
        const cost = item.pricing?.costPrice || 100;

        batches.push({ batchNumber: `BTH260${String(idx++).padStart(4, '0')}`, item: item._id, warehouse: wh._id, supplier, manufacturingDate: addMonths(now, -6), expiryDate: addMonths(now, 18), quantity: 500, remainingQuantity: 450, unitCost: cost, totalCost: 500 * cost, status: 'active', notes: `Regular stock - ${item.name}`, referenceType: 'PURCHASE_ORDER', referenceNumber: `PO-${idx}` });
        batches.push({ batchNumber: `BTH260${String(idx++).padStart(4, '0')}`, item: item._id, warehouse: wh._id, supplier, manufacturingDate: addMonths(now, -3), expiryDate: addMonths(now, 24), quantity: 300, remainingQuantity: 300, unitCost: cost, totalCost: 300 * cost, status: 'active', notes: `Fresh stock - ${item.name}`, referenceType: 'PURCHASE_ORDER', referenceNumber: `PO-${idx}` });
        batches.push({ batchNumber: `EXP260${String(idx++).padStart(4, '0')}`, item: item._id, warehouse: wh._id, supplier, manufacturingDate: addMonths(now, -12), expiryDate: addDays(now, 15), quantity: 100, remainingQuantity: 75, unitCost: cost, totalCost: 100 * cost, status: 'active', notes: `EXPIRING SOON - ${item.name}`, referenceType: 'PURCHASE_ORDER', referenceNumber: `PO-${idx}` });
        batches.push({ batchNumber: `EXP260${String(idx++).padStart(4, '0')}`, item: item._id, warehouse: wh._id, supplier, manufacturingDate: addMonths(now, -18), expiryDate: addDays(now, -10), quantity: 50, remainingQuantity: 30, unitCost: cost, totalCost: 50 * cost, status: 'expired', notes: `EXPIRED - needs disposal`, referenceType: 'PURCHASE_ORDER', referenceNumber: `PO-${idx}` });
        batches.push({ batchNumber: `DPL260${String(idx++).padStart(4, '0')}`, item: item._id, warehouse: wh._id, supplier, manufacturingDate: addMonths(now, -9), expiryDate: addMonths(now, 12), quantity: 200, remainingQuantity: 0, unitCost: cost, totalCost: 200 * cost, status: 'depleted', notes: `Fully consumed`, referenceType: 'PURCHASE_ORDER', referenceNumber: `PO-${idx}` });
        batches.push({ batchNumber: `QRT260${String(idx++).padStart(4, '0')}`, item: item._id, warehouse: wh._id, supplier, manufacturingDate: addMonths(now, -2), expiryDate: addMonths(now, 22), quantity: 100, remainingQuantity: 100, unitCost: cost, totalCost: 100 * cost, status: 'quarantined', notes: `Quality check pending`, referenceType: 'OTHER', referenceNumber: `QC-${idx}` });
      }
    }

    const firstItem = items[0];
    const firstWh = createdWarehouses[0];
    const supplier = suppliers.length > 0 ? suppliers[0]._id : null;
    const cost = firstItem.pricing?.costPrice || 100;

    for (let i = 0; i < 5; i++) {
      batches.push({ batchNumber: `EXW260${String(idx++).padStart(4, '0')}`, item: firstItem._id, warehouse: firstWh._id, supplier, manufacturingDate: addMonths(now, -14), expiryDate: addDays(now, 7 + i * 5), quantity: 80 + i * 10, remainingQuantity: 50 + i * 5, unitCost: cost, totalCost: (80 + i * 10) * cost, status: 'active', notes: `Expiring in ${7 + i * 5} days`, referenceType: 'PURCHASE_ORDER', referenceNumber: `PO-URG-${idx}` });
    }

    for (let i = 1; i <= 3; i++) {
      const itm = items[Math.min(i, items.length - 1)];
      batches.push({ batchNumber: `LOW260${String(idx++).padStart(4, '0')}`, item: itm._id, warehouse: firstWh._id, supplier, manufacturingDate: addMonths(now, -4), expiryDate: addMonths(now, 8), quantity: 50, remainingQuantity: 5 + i, unitCost: itm.pricing?.costPrice || 100, totalCost: 50 * (itm.pricing?.costPrice || 100), status: 'active', notes: `Low stock - reorder needed`, referenceType: 'PURCHASE_ORDER', referenceNumber: `PO-LOW-${idx}` });
    }

    await Batch.deleteMany({});
    const result = await Batch.insertMany(batches, { ordered: false });
    console.log(`Created ${result.length} batches`);

    const stats = { active: 0, expired: 0, depleted: 0, quarantined: 0 };
    result.forEach(b => stats[b.status]++);
    console.log(`Status breakdown: Active=${stats.active}, Expired=${stats.expired}, Depleted=${stats.depleted}, Quarantined=${stats.quarantined}`);

    const expiringSoon = result.filter(b => {
      const days = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30 && b.status === 'active';
    });
    console.log(`Expiring within 30 days: ${expiringSoon.length}`);

    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedBatches();
