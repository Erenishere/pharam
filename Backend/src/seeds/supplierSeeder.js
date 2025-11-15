const Supplier = require('../models/Supplier');

const suppliers = [
  {
    code: 'SUPP000001',
    name: 'Prime Wholesale Suppliers',
    type: 'supplier',
    contactInfo: {
      phone: '+92-300-7777777',
      email: 'prime@wholesale.com',
      address: 'Warehouse 12, Industrial Zone',
      city: 'Karachi',
      country: 'Pakistan',
    },
    financialInfo: {
      creditLimit: 0,
      paymentTerms: 30,
      taxNumber: 'TAX-PWS-001',
      currency: 'PKR',
    },
    isActive: true,
  },
  {
    code: 'SUPP000002',
    name: 'Quality Goods Distributors',
    type: 'supplier',
    contactInfo: {
      phone: '+92-321-8888888',
      email: 'quality@goods.com',
      address: 'Shop 56, Market Street',
      city: 'Faisalabad',
      country: 'Pakistan',
    },
    financialInfo: {
      creditLimit: 0,
      paymentTerms: 15,
      taxNumber: 'TAX-QGD-002',
      currency: 'PKR',
    },
    isActive: true,
  },
  {
    code: 'SUPP000003',
    name: 'International Suppliers Co',
    type: 'supplier',
    contactInfo: {
      phone: '+92-333-9999999',
      email: 'intl@suppliers.com',
      address: 'Office 301, Trade Center',
      city: 'Lahore',
      country: 'Pakistan',
    },
    financialInfo: {
      creditLimit: 0,
      paymentTerms: 60,
      taxNumber: 'TAX-ISC-003',
      currency: 'PKR',
    },
    isActive: true,
  },
];

module.exports = {
  async seed() {
    await Supplier.deleteMany({});
    await Supplier.insertMany(suppliers);
    console.log(`  - Created ${suppliers.length} suppliers`);
  },

  async clear() {
    await Supplier.deleteMany({});
    console.log('  - Suppliers cleared');
  },
};
