const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/User');
const Supplier = require('./src/models/Supplier');
const Item = require('./src/models/Item');

async function testPurchaseInvoice() {
  try {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indus-traders-test');
    
    // Clear collections
    await User.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    
    // Create test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    // Generate auth token
    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign(
      { userId: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );

    // Create test supplier
    const testSupplier = await Supplier.create({
      code: 'SUPP001',
      name: 'Test Supplier',
      type: 'supplier',
      contactInfo: {
        phone: '1234567890',
        email: 'supplier@test.com',
        address: '123 Test St',
        city: 'Karachi',
        country: 'Pakistan'
      },
      financialInfo: {
        creditLimit: 0,
        paymentTerms: 30,
        currency: 'PKR'
      },
      isActive: true
    });

    // Create test item
    const testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Product 1',
      description: 'Test product description',
      category: 'Electronics',
      unit: 'piece',
      pricing: {
        costPrice: 100,
        salePrice: 150,
        currency: 'PKR'
      },
      tax: {
        gstRate: 18,
        whtRate: 0,
        taxCategory: 'standard'
      },
      inventory: {
        currentStock: 50,
        minimumStock: 10,
        maximumStock: 500
      },
      isActive: true
    });

    console.log('Test data created successfully');
    console.log('Supplier ID:', testSupplier._id);
    console.log('Item ID:', testItem._id);

    // Try to create purchase invoice
    const invoiceData = {
      supplierId: testSupplier._id,
      supplierBillNo: `BILL-${Date.now()}`,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          itemId: testItem._id,
          quantity: 20,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        }
      ],
      notes: 'Test purchase invoice'
    };

    console.log('\nAttempting to create purchase invoice...');
    console.log('Invoice data:', JSON.stringify(invoiceData, null, 2));

    const response = await request(app)
      .post('/api/v1/invoices/purchase')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invoiceData);

    console.log('\nResponse status:', response.status);
    console.log('Response body:', JSON.stringify(response.body, null, 2));

    if (response.status !== 201) {
      console.error('\n❌ Purchase invoice creation failed!');
    } else {
      console.log('\n✅ Purchase invoice created successfully!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testPurchaseInvoice();
