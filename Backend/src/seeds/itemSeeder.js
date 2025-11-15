const Item = require('../models/Item');

const items = [
  {
    code: 'ITEM000001',
    name: 'Rice - Basmati Premium',
    description: 'Premium quality basmati rice, 1kg pack',
    category: 'Food & Beverages',
    unit: 'kg',
    pricing: {
      costPrice: 180,
      salePrice: 220,
      currency: 'PKR',
    },
    tax: {
      gstRate: 17,
      whtRate: 0,
      taxCategory: 'standard',
    },
    inventory: {
      currentStock: 500,
      minimumStock: 100,
      maximumStock: 2000,
    },
    isActive: true,
  },
  {
    code: 'ITEM000002',
    name: 'Cooking Oil - 1 Liter',
    description: 'Pure cooking oil, 1 liter bottle',
    category: 'Food & Beverages',
    unit: 'liter',
    pricing: {
      costPrice: 350,
      salePrice: 420,
      currency: 'PKR',
    },
    tax: {
      gstRate: 17,
      whtRate: 0,
      taxCategory: 'standard',
    },
    inventory: {
      currentStock: 300,
      minimumStock: 50,
      maximumStock: 1000,
    },
    isActive: true,
  },
  {
    code: 'ITEM000003',
    name: 'Sugar - White Refined',
    description: 'White refined sugar, 1kg pack',
    category: 'Food & Beverages',
    unit: 'kg',
    pricing: {
      costPrice: 90,
      salePrice: 110,
      currency: 'PKR',
    },
    tax: {
      gstRate: 8,
      whtRate: 0,
      taxCategory: 'reduced',
    },
    inventory: {
      currentStock: 800,
      minimumStock: 200,
      maximumStock: 3000,
    },
    isActive: true,
  },
  {
    code: 'ITEM000004',
    name: 'Wheat Flour - All Purpose',
    description: 'All purpose wheat flour, 5kg bag',
    category: 'Food & Beverages',
    unit: 'kg',
    pricing: {
      costPrice: 400,
      salePrice: 480,
      currency: 'PKR',
    },
    tax: {
      gstRate: 8,
      whtRate: 0,
      taxCategory: 'reduced',
    },
    inventory: {
      currentStock: 250,
      minimumStock: 50,
      maximumStock: 1000,
    },
    isActive: true,
  },
  {
    code: 'ITEM000005',
    name: 'Tea - Premium Black',
    description: 'Premium black tea, 500g pack',
    category: 'Food & Beverages',
    unit: 'gram',
    pricing: {
      costPrice: 450,
      salePrice: 550,
      currency: 'PKR',
    },
    tax: {
      gstRate: 17,
      whtRate: 0,
      taxCategory: 'standard',
    },
    inventory: {
      currentStock: 150,
      minimumStock: 30,
      maximumStock: 500,
    },
    isActive: true,
  },
];

module.exports = {
  async seed() {
    await Item.deleteMany({});
    await Item.insertMany(items);
    console.log(`  - Created ${items.length} items`);
  },

  async clear() {
    await Item.deleteMany({});
    console.log('  - Items cleared');
  },
};
