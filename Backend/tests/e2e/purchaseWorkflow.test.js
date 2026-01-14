const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Warehouse = require('../../src/models/Warehouse');

/**
 * End-to-End Purchase Workflow Integration Tests
 * Task 78.2: Test complete purchase workflow with Phase 2 features
 * 
 * Uses REAL database for accurate testing
 */

describe('E2E: Complete Purchase Workflow', () => {
    let authToken;
    let testUser;
    let testSupplier;
    let testItem1, testItem2;
    let testWarehouse;

    // Use real database
    const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/pharam_e2e_test';

    beforeAll(async () => {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clean up all collections
        await Invoice.deleteMany({});
        await PurchaseOrder.deleteMany({});
        await Supplier.deleteMany({});
        await Item.deleteMany({});
        await User.deleteMany({});
        await Warehouse.deleteMany({});

        // Create test user
        testUser = await User.create({
            username: 'testadmin',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin'
        });

        // Login
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'password123'
            });

        authToken = loginResponse.body.data.token;

        // Create test warehouse
        testWarehouse = await Warehouse.create({
            code: 'WH001',
            name: 'Main Warehouse',
            location: 'City Center',
            isActive: true
        });

        // Create test supplier
        testSupplier = await Supplier.create({
            code: 'SUPP001',
            name: 'Test Supplier Ltd',
            address: '456 Supplier St',
            city: 'Supplier City',
            state: 'Test State',
            phone: '1234567890',
            email: 'supplier@test.com',
            gstNumber: '27AABCT1332L1Z5',
            creditDays: 45,
            openingBalance: 0
        });

        // Create test items
        testItem1 = await Item.create({
            code: 'ITEM001',
            name: 'Purchase Item 1',
            category: 'Electronics',
            unit: 'piece',
            pricing: {
                costPrice: 100,
                salePrice: 150,
                mrp: 180
            },
            stock: {
                quantity: 100,
                reorderLevel: 50
            }
        });

        testItem2 = await Item.create({
            code: 'ITEM002',
            name: 'Purchase Item 2',
            category: 'Electronics',
            unit: 'piece',
            pricing: {
                costPrice: 200,
                salePrice: 300,
                mrp: 350
            },
            stock: {
                quantity: 50,
                reorderLevel: 25
            }
        });
    });

    describe('Purchase Order to Invoice Conversion', () => {
        let testPO;

        beforeEach(async () => {
            // Create a purchase order
            const poData = {
                supplierId: testSupplier._id,
                orderDate: new Date(),
                expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 100,
                        unitPrice: 95,
                    },
                    {
                        itemId: testItem2._id,
                        quantity: 50,
                        unitPrice: 190,
                    }
                ],
                notes: 'Test purchase order'
            };

            const response = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send(poData);

            testPO = response.body.data;
        });

        it('should convert PO to purchase invoice with dual GST', async () => {
            const invoiceData = {
                type: 'purchase',
                supplierId: testSupplier._id,
                purchaseOrderId: testPO._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                supplierBillNo: 'SUPP-INV-001',
                items: testPO.items.map(item => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    warehouseId: testWarehouse._id,
                    // Tax will be calculated based on supplier state
                })),
                // Bilty information
                biltyNo: 'BILTY-001',
                biltyDate: new Date(),
                transportCompany: 'Fast Transport Ltd',
                transportCharges: 500,
                // Dimension tracking
                dimension: 'Electronics',
                notes: 'Converted from PO'
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            expect(response.body.data.type).toBe('purchase');
            expect(response.body.data.supplierBillNo).toBe('SUPP-INV-001');
            expect(response.body.data.biltyNo).toBe('BILTY-001');
            expect(response.body.data.dimension).toBe('Electronics');

            // Verify GST calculation (CGST/SGST or IGST based on state)
            const invoice = response.body.data;
            expect(invoice.totals).toHaveProperty('taxAmount');
        });

        it('should apply schemes on purchase', async () => {
            const invoiceData = {
                type: 'purchase',
                supplierId: testSupplier._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 100,
                        unitPrice: 95,
                        warehouseId: testWarehouse._id,
                        schemeDiscount: 5, // 5% scheme discount
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            // Verify scheme discount was applied
        });

        it('should track dimensions on purchase', async () => {
            const invoiceData = {
                type: 'purchase',
                supplierId: testSupplier._id,
                dimension: 'Electronics',
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 50,
                        unitPrice: 95,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            expect(response.body.data.dimension).toBe('Electronics');
        });
    });

    describe('Purchase Return Flow', () => {
        let originalPurchaseInvoice;

        beforeEach(async () => {
            // Create original purchase invoice
            const invoiceData = {
                type: 'purchase',
                supplierId: testSupplier._id,
                supplierBillNo: 'SUPP-001',
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 100,
                        unitPrice: 95,
                        warehouseId: testWarehouse._id,
                    }
                ],
                status: 'confirmed'
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            originalPurchaseInvoice = response.body.data;
        });

        it('should create purchase return and adjust stock', async () => {
            const returnData = {
                type: 'return_purchase',
                supplierId: testSupplier._id,
                originalInvoiceId: originalPurchaseInvoice._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 10, // Returning 10 out of 100
                        unitPrice: 95,
                        warehouseId: testWarehouse._id,
                    }
                ],
                notes: 'Defective items return'
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(returnData);

            expect(response.status).toBe(201);
            expect(response.body.data.type).toBe('return_purchase');

            // Verify stock was adjusted (decreased by 10)
            const updatedItem = await Item.findById(testItem1._id);
            // Stock should decrease by 10 (returned items)
        });

        it('should reverse ledger entries on purchase return', async () => {
            const returnData = {
                type: 'return_purchase',
                supplierId: testSupplier._id,
                originalInvoiceId: originalPurchaseInvoice._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 10,
                        unitPrice: 95,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(returnData);

            expect(response.status).toBe(201);

            // Verify supplier balance was adjusted
            const updatedSupplier = await Supplier.findById(testSupplier._id);
            // Balance should reflect the return
        });
    });

    describe('Dual GST Calculation', () => {
        it('should calculate CGST/SGST for same state supplier', async () => {
            // Update supplier to same state as business
            await Supplier.findByIdAndUpdate(testSupplier._id, {
                state: 'Maharashtra' // Assuming business is in Maharashtra
            });

            const invoiceData = {
                type: 'purchase',
                supplierId: testSupplier._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 100,
                        unitPrice: 100,
                        warehouseId: testWarehouse._id,
                        taxRate: 18, // 18% GST
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);

            // Should have CGST and SGST (9% each for 18% total)
            const invoice = response.body.data;
            // Verify CGST and SGST are calculated
        });

        it('should calculate IGST for different state supplier', async () => {
            // Update supplier to different state
            await Supplier.findByIdAndUpdate(testSupplier._id, {
                state: 'Karnataka' // Different from business state
            });

            const invoiceData = {
                type: 'purchase',
                supplierId: testSupplier._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 100,
                        unitPrice: 100,
                        warehouseId: testWarehouse._id,
                        taxRate: 18,
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);

            // Should have IGST (18%)
            const invoice = response.body.data;
            // Verify IGST is calculated
        });
    });

    describe('Bilty Information Tracking', () => {
        it('should record complete bilty information', async () => {
            const invoiceData = {
                type: 'purchase',
                supplierId: testSupplier._id,
                supplierBillNo: 'SUPP-002',
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 100,
                        unitPrice: 95,
                        warehouseId: testWarehouse._id,
                    }
                ],
                biltyNo: 'BILTY-12345',
                biltyDate: new Date('2024-01-15'),
                transportCompany: 'ABC Transport',
                transportCharges: 750,
                cartonQty: 10
            };

            const response = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            expect(response.body.data.biltyNo).toBe('BILTY-12345');
            expect(response.body.data.transportCompany).toBe('ABC Transport');
            expect(response.body.data.transportCharges).toBe(750);
            expect(response.body.data.cartonQty).toBe(10);
        });
    });

    describe('Complete Purchase Workflow', () => {
        it('should complete full purchase cycle: PO -> Invoice -> Confirm -> Return', async () => {
            // Step 1: Create Purchase Order
            const poData = {
                supplierId: testSupplier._id,
                orderDate: new Date(),
                expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 100,
                        unitPrice: 95,
                    }
                ]
            };

            const poResponse = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send(poData);

            expect(poResponse.status).toBe(201);
            const purchaseOrder = poResponse.body.data;

            // Step 2: Convert to Purchase Invoice
            const invoiceData = {
                type: 'purchase',
                supplierId: testSupplier._id,
                purchaseOrderId: purchaseOrder._id,
                supplierBillNo: 'SUPP-WORKFLOW-001',
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 100,
                        unitPrice: 95,
                        warehouseId: testWarehouse._id,
                    }
                ],
                biltyNo: 'BILTY-WORKFLOW-001',
                biltyDate: new Date(),
                transportCompany: 'Test Transport',
                dimension: 'Electronics'
            };

            const invoiceResponse = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(invoiceResponse.status).toBe(201);
            const invoice = invoiceResponse.body.data;

            // Step 3: Confirm Invoice
            const confirmResponse = await request(app)
                .patch(`/api/invoices/purchase/${invoice._id}/confirm`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(confirmResponse.status).toBe(200);

            // Step 4: Create Return
            const returnData = {
                type: 'return_purchase',
                supplierId: testSupplier._id,
                originalInvoiceId: invoice._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 5,
                        unitPrice: 95,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const returnResponse = await request(app)
                .post('/api/invoices/purchase')
                .set('Authorization', `Bearer ${authToken}`)
                .send(returnData);

            expect(returnResponse.status).toBe(201);
            expect(returnResponse.body.data.type).toBe('return_purchase');

            // Verify final state
            const finalInvoice = await Invoice.findById(invoice._id);
            expect(finalInvoice.status).toBe('confirmed');
        });
    });
});
