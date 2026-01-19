const mongoose = require('mongoose');
require('dotenv').config();

// Models
const User = require('./src/models/User');
const Company = require('./src/models/Company');
const Scheme = require('./src/models/Scheme');
const Invoice = require('./src/models/Invoice');
const Item = require('./src/models/Item');
const Customer = require('./src/models/Customer');
const Supplier = require('./src/models/Supplier');
const Warehouse = require('./src/models/Warehouse');
const Inventory = require('./src/models/Inventory');

// Seeders
const userSeeder = require('./src/seeds/userSeeder');
const warehouseSeeder = require('./src/seeds/warehouseSeeder');
const itemSeeder = require('./src/seeds/itemSeeder');
const customerSeeder = require('./src/seeds/customerSeeder');
const supplierSeeder = require('./src/seeds/supplierSeeder');

// Config
// Use remote URI but switch to a test database to prevent overwriting production/dev data
const BASE_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharam_db';
const MONGO_URI = BASE_URI.replace('indus_traders', 'indus_traders_test');

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}

async function createCompany(adminUser) {
    let company = await Company.findOne({ name: 'Industraders Pharma' });
    if (!company) {
        company = await Company.create({
            name: 'Industraders Pharma',
            code: 'CMP001',
            address: 'Karachi, Pakistan',
            phone: '+921234567890',
            email: 'info@industraders.com',
            owner: adminUser._id
        });
        console.log('  - Created Default Company');
    }
    return company;
}

async function createSchemes(company, adminUser, items) {
    await Scheme.deleteMany({});

    const scheme1 = await Scheme.create({
        name: 'Buy 10 Get 1 Free',
        type: 'scheme1',
        company: company._id,
        schemeFormat: '10+1',
        description: 'Standard drug scheme',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        applicableItems: items.slice(0, 3).map(i => i._id), // Applies to first 3 items
        minimumQuantity: 10,
        createdBy: adminUser._id,
        isActive: true
    });

    const scheme2 = await Scheme.create({
        name: 'Bulk Discount 5%',
        type: 'scheme2',
        company: company._id,
        schemeFormat: '5%',
        discountPercent: 5,
        description: 'Bulk purchase discount',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        applicableItems: [items[3]._id],
        minimumQuantity: 50,
        createdBy: adminUser._id,
        isActive: true
    });

    console.log('  - Created 2 Schemes');
    return [scheme1, scheme2];
}

async function createPurchaseInvoices(supplier, items, warehouse, adminUser) {
    await Invoice.deleteMany({ type: 'purchase' });
    // We need to clear inventory too as purchases add stock
    await Inventory.deleteMany({});

    const invoiceDate = new Date('2024-01-10');
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = new Invoice({
        invoiceNumber: 'PUR-001',
        type: 'purchase',
        supplierId: supplier._id,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        supplierBillNo: 'BILL-001-' + Date.now(),
        status: 'confirmed',
        items: items.map(item => {
            // Strict GST mapping to allowed enum values [0, 4, 18]
            const validRates = [0, 4, 18];
            const originalRate = item.tax.gstRate || 0;
            const gstRate = validRates.includes(originalRate) ? originalRate : 18;
            const unitPrice = item.pricing.costPrice;
            const quantity = 1000;
            const lineTotal = quantity * unitPrice;

            return {
                itemId: item._id,
                quantity: quantity,
                unitPrice: unitPrice,
                warehouseId: warehouse._id,
                gstRate: gstRate,
                lineTotal: lineTotal,
                batchInfo: {
                    batchNumber: 'BATCH-001',
                    expiryDate: new Date('2025-12-31')
                }
            };
        }),
        totals: {
            subtotal: items.reduce((sum, i) => sum + (1000 * i.pricing.costPrice), 0),
            grandTotal: items.reduce((sum, i) => sum + (1000 * i.pricing.costPrice), 0),
        },
        createdBy: adminUser._id
    });
    await invoice.save();

    // Create Inventory records
    for (const item of items) {
        await Inventory.create({
            item: item._id,
            warehouse: warehouse._id,
            quantity: 1000,
            batchNumber: 'BATCH-001',
            expiryDate: new Date('2025-12-31'),
            status: 'available'
        });
    }

    console.log('  - Created Purchase Invoice & Stock');
}

async function createSalesInvoices(customer, items, warehouse, adminUser) {
    await Invoice.deleteMany({ type: 'sales' });

    // 1. Regular Invoice with Scheme 1
    const invoiceDate = new Date('2024-02-15');
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 7);

    // Fix GST Rate mapping
    const validRates = [0, 4, 18];
    const originalRate0 = items[0].tax.gstRate || 0;
    const gstRate0 = validRates.includes(originalRate0) ? originalRate0 : 18;
    const unitPrice0 = items[0].pricing.salePrice;

    const inv1 = await Invoice.create({
        invoiceNumber: 'INV-001',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        status: 'confirmed',
        items: [{
            itemId: items[0]._id, // First item has 10+1 scheme
            quantity: 10,
            scheme1Quantity: 1, // Free item
            unitPrice: unitPrice0,
            warehouseId: warehouse._id,
            gstRate: gstRate0,
            lineTotal: 10 * unitPrice0
        }],
        totals: {
            subtotal: 10 * unitPrice0,
            grandTotal: (10 * unitPrice0) * (1 + (gstRate0 / 100))
        },
        createdBy: adminUser._id
    });

    // 2. Legacy Invoice (Missing Totals) - To test stability fix
    const legacyDate = new Date('2023-12-01');
    const legacyDueDate = new Date(legacyDate);
    legacyDueDate.setDate(legacyDueDate.getDate() + 7);

    const originalRate1 = items[1].tax.gstRate || 0;
    const gstRate1 = validRates.includes(originalRate1) ? originalRate1 : 18;

    const legacyInv = new Invoice({
        invoiceNumber: 'LEGACY-001',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: legacyDate,
        dueDate: legacyDueDate,
        status: 'confirmed',
        items: [{
            itemId: items[1]._id,
            quantity: 5,
            unitPrice: items[1].pricing.salePrice,
            warehouseId: warehouse._id,
            lineTotal: 5 * items[1].pricing.salePrice,
            gstRate: gstRate1
        }],
        // DELIBERATELY OMITTING TOTALS FIELD
        createdBy: adminUser._id
    });
    // Force save bypassing validation (if any strict require on totals exists in model/schema)
    // If schema requires it, we might need to set it to null or empty obj
    legacyInv.totals = undefined;
    await legacyInv.save({ validateBeforeSave: false }); // Mongoose bypass

    console.log('  - Created Sales Invoices (including Legacy/Broken Data)');
}

async function seed() {
    await connectDB();
    console.log('--- Seeding Test Database ---');

    // 1. Run Standard Seeders
    await userSeeder.seed();
    await warehouseSeeder.seed();
    await itemSeeder.seed();
    await customerSeeder.seed();
    await supplierSeeder.seed();

    // 2. Fetch Base Data
    const adminUser = await User.findOne({ username: 'admin' });
    const warehouse = await Warehouse.findOne({ code: 'WH0001' });
    const items = await Item.find({});
    const supplier = await Supplier.findOne({});
    const customer = await Customer.findOne({}); // Retail customer hopefully

    // 3. System Data
    const company = await createCompany(adminUser);
    const schemes = await createSchemes(company, adminUser, items);

    // 4. Transactions
    await createPurchaseInvoices(supplier, items, warehouse, adminUser);
    await createSalesInvoices(customer, items, warehouse, adminUser);

    console.log('--- Seeding Complete ---');
    process.exit(0);
}

seed();
