const Customer = require('../models/Customer');

const customers = [
  {
    code: 'CUST000001',
    name: 'ABC Trading Company',
    type: 'customer',
    contactInfo: {
      phone: '+92-300-1234567',
      email: 'abc@trading.com',
      address: 'Plot 123, Industrial Area',
      city: 'Karachi',
      country: 'Pakistan',
    },
    financialInfo: {
      creditLimit: 500000,
      paymentTerms: 30,
      taxNumber: 'TAX-ABC-001',
      currency: 'PKR',
    },
    isActive: true,
  },
  {
    code: 'CUST000002',
    name: 'XYZ Enterprises',
    type: 'customer',
    contactInfo: {
      phone: '+92-321-9876543',
      email: 'xyz@enterprises.com',
      address: 'Building 45, Main Boulevard',
      city: 'Lahore',
      country: 'Pakistan',
    },
    financialInfo: {
      creditLimit: 300000,
      paymentTerms: 15,
      taxNumber: 'TAX-XYZ-002',
      currency: 'PKR',
    },
    isActive: true,
  },
  {
    code: 'CUST000003',
    name: 'Global Imports Ltd',
    type: 'both',
    contactInfo: {
      phone: '+92-333-5555555',
      email: 'info@globalimports.com',
      address: 'Tower A, Business District',
      city: 'Islamabad',
      country: 'Pakistan',
    },
    financialInfo: {
      creditLimit: 1000000,
      paymentTerms: 45,
      taxNumber: 'TAX-GLB-003',
      currency: 'PKR',
    },
    isActive: true,
  },
  {
    code: 'CUST000004',
    name: 'Adeel',
    type: 'supplier',
    contactInfo: {
      phone: '+92-300-9999999',
      email: 'adeel@supplier.com',
      address: 'Shop 22, Market Street',
      city: 'Karachi',
      country: 'Pakistan',
    },
    financialInfo: {
      creditLimit: 250000,
      paymentTerms: 30,
      taxNumber: 'TAX-ADEEL-004',
      currency: 'PKR',
    },
    isActive: true,
  },
];

module.exports = {
  async seed() {
    await Customer.deleteMany({});
    await Customer.insertMany(customers);
    console.log(`  - Created ${customers.length} customers`);
  },

  async clear() {
    await Customer.deleteMany({});
    console.log('  - Customers cleared');
  },
};
