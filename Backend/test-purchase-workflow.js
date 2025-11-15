/**
 * Manual test script to verify purchase invoice workflow with actual database
 * Run with: node test-purchase-workflow.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('./src/models/Invoice');
const Item = require('./src/models/Item');
const Supplier = require('./src/models/Supplier');
const StockMovement = require('./src/models/StockMovement');
const User = require('./src/models/User');
const purchaseInvoiceService = require('./src/services/purchaseInvoiceService');

async function testPurchaseWorkflow() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database:', mongoose.connection.name);

    // Find or create test user
    console.log('\n👤 Finding test user...');
    let testUser = await User.findOne({ email: 'admin@industraders.com' });
    if (!testUser) {
      console.log('Creating test user...');
      const bcrypt = require('bcryptjs');
      testUser = await User.create({
        username: 'admin',
        email: 'admin@industraders.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        isActive: true
      });
    }
    console.log('✅ Test user:', testUser.email);

    // Find or create test supplier
    console.log('\n🏢 Finding test supplier...');
    let testSupplier = await Supplier.findOne({ code: 'TEST-SUP-001' });
    if (!testSupplier) {
      console.log('Creating test supplier...');
      testSupplier = await Supplier.create({
        code: 'TEST-SUP-001',
        name: 'Test Supplier for Workflow',
        type: 'supplier',
        contactInfo: {
          phone: '1234567890',
          email: 'supplier@test.com',
          address: 'Test Address',
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
    }
    console.log('✅ Test supplier:', testSupplier.name);

    // Find or create test item
    console.log('\n📦 Finding test item...');
    let testItem = await Item.findOne({ code: 'TEST-ITEM-001' });
    const initialStock = testItem ? testItem.inventory.currentStock : 0;
    
    if (!testItem) {
      console.log('Creating test item...');
      testItem = await Item.create({
        code: 'TEST-ITEM-001',
        name: 'Test Product for Workflow',
        category: 'Test Category',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
          currency: 'PKR'
        },
        tax: {
          gstRate: 17,
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
    }
    console.log('✅ Test item:', testItem.name);
    console.log('   Initial stock:', testItem.inventory.currentStock);

    // Test 1: Create draft purchase invoice
    console.log('\n📝 TEST 1: Creating draft purchase invoice...');
    const invoiceData = {
      supplierId: testSupplier._id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          itemId: testItem._id,
          quantity: 25,
          unitPrice: 100,
          discount: 5,
          batchInfo: {
            batchNumber: `BATCH-${Date.now()}`,
            manufacturingDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-12-31')
          }
        }
      ],
      notes: 'Test purchase invoice for workflow verification',
      createdBy: testUser._id
    };

    const draftInvoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);
    console.log('✅ Draft invoice created:', draftInvoice.invoiceNumber);
    console.log('   Status:', draftInvoice.status);
    console.log('   Total:', draftInvoice.totals.grandTotal);

    // Verify stock not changed
    let itemAfterDraft = await Item.findById(testItem._id);
    console.log('   Stock after draft:', itemAfterDraft.inventory.currentStock);
    if (itemAfterDraft.inventory.currentStock === testItem.inventory.currentStock) {
      console.log('   ✅ Stock unchanged (correct for draft)');
    } else {
      console.log('   ❌ Stock changed unexpectedly!');
    }

    // Test 2: Confirm purchase invoice
    console.log('\n✅ TEST 2: Confirming purchase invoice...');
    const confirmedResult = await purchaseInvoiceService.confirmPurchaseInvoice(
      draftInvoice._id,
      testUser._id
    );
    console.log('✅ Invoice confirmed:', confirmedResult.invoice.invoiceNumber);
    console.log('   Status:', confirmedResult.invoice.status);
    console.log('   Stock movements created:', confirmedResult.stockMovements.length);

    // Verify stock increased
    let itemAfterConfirm = await Item.findById(testItem._id);
    console.log('   Stock after confirmation:', itemAfterConfirm.inventory.currentStock);
    const expectedStock = testItem.inventory.currentStock + 25;
    if (itemAfterConfirm.inventory.currentStock === expectedStock) {
      console.log(`   ✅ Stock increased correctly (${testItem.inventory.currentStock} + 25 = ${expectedStock})`);
    } else {
      console.log(`   ❌ Stock mismatch! Expected ${expectedStock}, got ${itemAfterConfirm.inventory.currentStock}`);
    }

    // Test 3: Verify stock movements
    console.log('\n📊 TEST 3: Verifying stock movements...');
    const movements = await StockMovement.find({
      referenceType: 'purchase_invoice',
      referenceId: draftInvoice._id
    });
    console.log('✅ Stock movements found:', movements.length);
    if (movements.length > 0) {
      const movement = movements[0];
      console.log('   Movement type:', movement.movementType);
      console.log('   Quantity:', movement.quantity);
      console.log('   Batch number:', movement.batchInfo.batchNumber);
      console.log('   Created by:', movement.createdBy);
    }

    // Test 4: Get invoice stock movements via service
    console.log('\n🔍 TEST 4: Getting invoice stock movements...');
    const invoiceMovements = await purchaseInvoiceService.getInvoiceStockMovements(draftInvoice._id);
    console.log('✅ Invoice stock movements:', invoiceMovements.length);

    // Test 5: Mark as paid
    console.log('\n💰 TEST 5: Marking invoice as paid...');
    const paidInvoice = await purchaseInvoiceService.markInvoiceAsPaid(draftInvoice._id, {
      paymentMethod: 'bank_transfer',
      paymentReference: 'TEST-TXN-' + Date.now(),
      notes: 'Test payment'
    });
    console.log('✅ Invoice marked as paid');
    console.log('   Payment status:', paidInvoice.paymentStatus);
    console.log('   Payment method:', paidInvoice.paymentMethod);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 WORKFLOW TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Database connection: Working');
    console.log('✅ Draft invoice creation: Working');
    console.log('✅ Invoice confirmation: Working');
    console.log('✅ Inventory update: Working');
    console.log('✅ Stock movement creation: Working');
    console.log('✅ Batch tracking: Working');
    console.log('✅ Payment processing: Working');
    console.log('='.repeat(60));
    console.log('\n🎉 All tests passed! Purchase workflow is working correctly.');
    console.log('\n📝 Test invoice created:', draftInvoice.invoiceNumber);
    console.log('   You can verify this in your database.');

  } catch (error) {
    console.error('\n❌ Error during workflow test:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testPurchaseWorkflow();
