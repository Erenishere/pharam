const User = require('../models/User');

const users = [
  {
    username: 'admin',
    email: 'admin@industraders.com',
    password: 'Admin@123',
    role: 'admin',
    isActive: true,
  },
  {
    username: 'sales_user',
    email: 'sales@industraders.com',
    password: 'Sales@123',
    role: 'sales',
    isActive: true,
  },
  {
    username: 'purchase_user',
    email: 'purchase@industraders.com',
    password: 'Purchase@123',
    role: 'purchase',
    isActive: true,
  },
  {
    username: 'inventory_user',
    email: 'inventory@industraders.com',
    password: 'Inventory@123',
    role: 'inventory',
    isActive: true,
  },
  {
    username: 'accountant',
    email: 'accountant@industraders.com',
    password: 'Accountant@123',
    role: 'accountant',
    isActive: true,
  },
  {
    username: 'data_entry',
    email: 'dataentry@industraders.com',
    password: 'DataEntry@123',
    role: 'data_entry',
    isActive: true,
  },
];

module.exports = {
  async seed() {
    await User.deleteMany({});
    await User.insertMany(users);
    console.log(`  - Created ${users.length} users`);
  },

  async clear() {
    await User.deleteMany({});
    console.log('  - Users cleared');
  },
};
