require('dotenv').config();
const database = require('../config/database');
const userSeeder = require('./userSeeder');
const customerSeeder = require('./customerSeeder');
const supplierSeeder = require('./supplierSeeder');
const itemSeeder = require('./itemSeeder');
const routeSeeder = require('./routeSeeder');
const salesmanSeeder = require('./salesmanSeeder');
const pharmaSeeder = require('./pharmaSeeder');
const accountSeeder = require('./accountSeeder');

class DatabaseSeeder {
  constructor() {
    this.seeders = [
      { name: 'Users', seeder: userSeeder },
      { name: 'Routes', seeder: routeSeeder },
      { name: 'Salesmen', seeder: salesmanSeeder },
      { name: 'Customers', seeder: customerSeeder },
      { name: 'Suppliers', seeder: supplierSeeder },
      { name: 'Items', seeder: itemSeeder },
      { name: 'Pharma Items', seeder: pharmaSeeder },
      { name: 'System Accounts', seeder: accountSeeder },
    ];
  }

  async seed() {
    try {
      console.log('Starting database seeding...');
      await database.connect();

      for (const { name, seeder } of this.seeders) {
        console.log(`Seeding ${name}...`);
        await seeder.seed();
        console.log(`${name} seeded successfully`);
      }

      console.log('Database seeding completed successfully');
      await database.disconnect();
      process.exit(0);
    } catch (error) {
      console.error('Database seeding failed:', error.message);
      await database.disconnect();
      process.exit(1);
    }
  }

  async clear() {
    try {
      console.log('Clearing database...');
      await database.connect();

      for (const { name, seeder } of this.seeders) {
        console.log(`Clearing ${name}...`);
        await seeder.clear();
        console.log(`${name} cleared successfully`);
      }

      console.log('Database cleared successfully');
      await database.disconnect();
      process.exit(0);
    } catch (error) {
      console.error('Database clearing failed:', error.message);
      await database.disconnect();
      process.exit(1);
    }
  }
}

const seeder = new DatabaseSeeder();

// Handle command line arguments
const command = process.argv[2];

if (command === 'seed') {
  seeder.seed();
} else if (command === 'clear') {
  seeder.clear();
} else {
  console.log('Usage: node seeds/index.js [seed|clear]');
  process.exit(1);
}

module.exports = DatabaseSeeder;
