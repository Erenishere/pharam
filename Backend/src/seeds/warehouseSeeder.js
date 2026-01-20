const Warehouse = require('../models/Warehouse');

const warehouses = [
  {
    code: 'WH0001',
    name: 'Main Warehouse - Karachi',
    location: {
      address: '123 Industrial Area, SITE',
      city: 'Karachi',
      state: 'Sindh',
      country: 'Pakistan',
      postalCode: '75700',
    },
    contact: {
      phone: '+92-21-1234567',
      email: 'main.warehouse@pharma.com',
    },
    isActive: true,
    capacity: 10000,
    openingHours: '8:00 AM - 8:00 PM',
    notes: 'Primary distribution center for Sindh region',
  },
  {
    code: 'WH0002',
    name: 'Branch Warehouse - Lahore',
    location: {
      address: '45 Sundar Industrial Estate',
      city: 'Lahore',
      state: 'Punjab',
      country: 'Pakistan',
      postalCode: '54000',
    },
    contact: {
      phone: '+92-42-9876543',
      email: 'lahore.warehouse@pharma.com',
    },
    isActive: true,
    capacity: 8000,
    openingHours: '9:00 AM - 7:00 PM',
    notes: 'Distribution center for Punjab region',
  },
  {
    code: 'WH0003',
    name: 'Branch Warehouse - Islamabad',
    location: {
      address: '78 I-9 Industrial Area',
      city: 'Islamabad',
      state: 'ICT',
      country: 'Pakistan',
      postalCode: '44000',
    },
    contact: {
      phone: '+92-51-5555555',
      email: 'islamabad.warehouse@pharma.com',
    },
    isActive: true,
    capacity: 5000,
    openingHours: '9:00 AM - 6:00 PM',
    notes: 'Distribution center for Northern region',
  },
];

module.exports = {
  async seed() {
    await Warehouse.deleteMany({});
    const created = await Warehouse.insertMany(warehouses);
    console.log(`  - Created ${created.length} warehouses`);
    return created;
  },

  async clear() {
    await Warehouse.deleteMany({});
    console.log('  - Warehouses cleared');
  },

  async getWarehouses() {
    let existing = await Warehouse.find({});
    if (existing.length === 0) {
      existing = await this.seed();
    }
    return existing;
  },
};
