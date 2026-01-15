const mongoose = require('mongoose');
const reportService = require('../../src/services/reportService');
const Salesman = require('../../src/models/Salesman');
const Invoice = require('../../src/models/Invoice');
const CashReceipt = require('../../src/models/CashReceipt');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');

/**
 * Unit Tests for Commission Calculation Service
 * Tests for Requirement 9.5 - Task 40.1
 */
describe('Commission Calculation Service', () => {
    let testSalesman1;
    let testSalesman2;
    let testCustomer;
    let testItem;

    beforeEach(async () => {
        // Create test salesmen with different commission rates
        testSalesman1 = await Salesman.create({
            code: 'SM001',
            name: 'John Doe',
            phone: '1234567890',
            email: 'john@example.com',
            commissionRate: 5, // 5% commission
            isActive: true
        });

        testSalesman2 = await Salesman.create({
            code: 'SM002',
            name: 'Jane Smith',
            phone: '0987654321',
            email: 'jane@example.com',
            commissionRate: 3, // 3% commission
            isActive: true
        });

        // Create test customer
        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            phone: '1234567890',
            address: 'Test Address',
            city: 'Test City',
            isActive: true
        });

        // Create test item
        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Test Category',
            unit: 'PCS',
            pricing: {
                costPrice: 100,
                salePrice: 150,
                mrp: 200
            },
            stock: {
                currentStock: 1000,
                minStock: 10,
                maxStock: 5000
            },
            isActive: true
        });
    });

    afterEach(async () => {
        await Salesman.deleteMany({});
        await Invoice.deleteMany({});
        await CashReceipt.deleteMany({});
        await Customer.deleteMany({});
        await Item.deleteMany({});
    });

    describe('calculateCommission - Basic Functionality', () => {
        it('should calculate commission based on sales only', async () => {
            // Create test sales invoice
            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500
                }],
                totals: {
                    subtotal: 1500,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1500
                },
                status: 'confirmed'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                { commissionBasis: 'sales' }
            );

            expect(result.reportType).toBe('salesman_commission');
            expect(result.commissionBasis).toBe('sales');
            expect(result.summary.totalSalesmen).toBe(1);
            expect(result.commissionDetails).toHaveLength(1);

            const commission = result.commissionDetails[0];
            expect(commission.salesmanCode).toBe('SM001');
            expect(commission.sales.totalSales).toBe(1500);
            expect(commission.sales.commission).toBe(75); // 5% of 1500
            expect(commission.collections.commission).toBe(0);
            expect(commission.totalCommission).toBe(75);
        });

        it('should calculate commission based on collections only', async () => {
            // Create test cash receipt
            await CashReceipt.create({
                receiptNumber: 'REC-001',
                receiptDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                amount: 2000,
                paymentMethod: 'cash',
                status: 'cleared'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                { commissionBasis: 'collections' }
            );

            expect(result.reportType).toBe('salesman_commission');
            expect(result.commissionBasis).toBe('collections');
            expect(result.summary.totalSalesmen).toBe(1);

            const commission = result.commissionDetails[0];
            expect(commission.collections.totalCollections).toBe(2000);
            expect(commission.collections.commission).toBe(100); // 5% of 2000
            expect(commission.sales.commission).toBe(0);
            expect(commission.totalCommission).toBe(100);
        });

        it('should calculate commission based on both sales and collections', async () => {
            // Create test sales invoice
            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500
                }],
                totals: {
                    subtotal: 1500,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1500
                },
                status: 'confirmed'
            });

            // Create test cash receipt
            await CashReceipt.create({
                receiptNumber: 'REC-001',
                receiptDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                amount: 2000,
                paymentMethod: 'cash',
                status: 'cleared'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                { commissionBasis: 'both' }
            );

            expect(result.commissionBasis).toBe('both');
            const commission = result.commissionDetails[0];
            expect(commission.sales.commission).toBe(75); // 5% of 1500
            expect(commission.collections.commission).toBe(100); // 5% of 2000
            expect(commission.totalCommission).toBe(175); // 75 + 100
            expect(result.summary.totalCommission).toBe(175);
        });
    });

    describe('calculateCommission - Multiple Salesmen', () => {
        it('should calculate commission for all active salesmen when no salesmanId provided', async () => {
            // Create invoices for both salesmen
            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500
                }],
                totals: {
                    subtotal: 1500,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1500
                },
                status: 'confirmed'
            });

            await Invoice.create({
                invoiceNumber: 'INV-002',
                type: 'sales',
                invoiceDate: new Date('2024-01-16'),
                customerId: testCustomer._id,
                salesmanId: testSalesman2._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 20,
                    unitPrice: 150,
                    lineTotal: 3000
                }],
                totals: {
                    subtotal: 3000,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 3000
                },
                status: 'confirmed'
            });

            const result = await reportService.calculateCommission(
                null,
                '2024-01-01',
                '2024-01-31',
                { commissionBasis: 'sales' }
            );

            expect(result.summary.totalSalesmen).toBe(2);
            expect(result.commissionDetails).toHaveLength(2);

            // Results should be sorted by total commission descending
            expect(result.commissionDetails[0].salesmanCode).toBe('SM002'); // Higher sales
            expect(result.commissionDetails[0].sales.commission).toBe(90); // 3% of 3000
            expect(result.commissionDetails[1].salesmanCode).toBe('SM001');
            expect(result.commissionDetails[1].sales.commission).toBe(75); // 5% of 1500

            expect(result.summary.totalSalesCommission).toBe(165); // 90 + 75
        });

        it('should sort salesmen by total commission in descending order', async () => {
            // Create different amounts for each salesman
            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 5,
                    unitPrice: 150,
                    lineTotal: 750
                }],
                totals: {
                    subtotal: 750,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 750
                },
                status: 'confirmed'
            });

            await Invoice.create({
                invoiceNumber: 'INV-002',
                type: 'sales',
                invoiceDate: new Date('2024-01-16'),
                customerId: testCustomer._id,
                salesmanId: testSalesman2._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 50,
                    unitPrice: 150,
                    lineTotal: 7500
                }],
                totals: {
                    subtotal: 7500,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 7500
                },
                status: 'confirmed'
            });

            const result = await reportService.calculateCommission(
                null,
                '2024-01-01',
                '2024-01-31'
            );

            // SM002 should be first (225 commission) despite lower rate because of higher sales
            expect(result.commissionDetails[0].salesmanCode).toBe('SM002');
            expect(result.commissionDetails[0].totalCommission).toBe(225); // 3% of 7500
            expect(result.commissionDetails[1].salesmanCode).toBe('SM001');
            expect(result.commissionDetails[1].totalCommission).toBe(37.5); // 5% of 750
        });
    });

    describe('calculateCommission - Custom Rates', () => {
        it('should use custom sales commission rate when provided', async () => {
            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500
                }],
                totals: {
                    subtotal: 1500,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1500
                },
                status: 'confirmed'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                {
                    commissionBasis: 'sales',
                    salesCommissionRate: 10 // Override with 10%
                }
            );

            const commission = result.commissionDetails[0];
            expect(commission.sales.commissionRate).toBe(10);
            expect(commission.sales.commission).toBe(150); // 10% of 1500 instead of 5%
        });

        it('should use custom collections commission rate when provided', async () => {
            await CashReceipt.create({
                receiptNumber: 'REC-001',
                receiptDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                amount: 2000,
                paymentMethod: 'cash',
                status: 'cleared'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                {
                    commissionBasis: 'collections',
                    collectionsCommissionRate: 7 // Override with 7%
                }
            );

            const commission = result.commissionDetails[0];
            expect(commission.collections.commissionRate).toBe(7);
            expect(commission.collections.commission).toBe(140); // 7% of 2000 instead of 5%
        });

        it('should use different custom rates for sales and collections', async () => {
            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500
                }],
                totals: {
                    subtotal: 1500,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1500
                },
                status: 'confirmed'
            });

            await CashReceipt.create({
                receiptNumber: 'REC-001',
                receiptDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                amount: 2000,
                paymentMethod: 'cash',
                status: 'cleared'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                {
                    commissionBasis: 'both',
                    salesCommissionRate: 8,
                    collectionsCommissionRate: 4
                }
            );

            const commission = result.commissionDetails[0];
            expect(commission.sales.commission).toBe(120); // 8% of 1500
            expect(commission.collections.commission).toBe(80); // 4% of 2000
            expect(commission.totalCommission).toBe(200);
        });
    });

    describe('calculateCommission - Edge Cases', () => {
        it('should return zero commission when no sales or collections exist', async () => {
            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31'
            );

            expect(result.summary.totalSalesmen).toBe(1);
            const commission = result.commissionDetails[0];
            expect(commission.sales.totalSales).toBe(0);
            expect(commission.collections.totalCollections).toBe(0);
            expect(commission.totalCommission).toBe(0);
        });

        it('should handle salesman with zero commission rate', async () => {
            // Create salesman with 0% commission
            const zeroCommissionSalesman = await Salesman.create({
                code: 'SM003',
                name: 'Zero Commission',
                commissionRate: 0,
                isActive: true
            });

            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: zeroCommissionSalesman._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500
                }],
                totals: {
                    subtotal: 1500,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1500
                },
                status: 'confirmed'
            });

            const result = await reportService.calculateCommission(
                zeroCommissionSalesman._id.toString(),
                '2024-01-01',
                '2024-01-31'
            );

            const commission = result.commissionDetails[0];
            expect(commission.sales.totalSales).toBe(1500);
            expect(commission.sales.commission).toBe(0);
            expect(commission.totalCommission).toBe(0);
        });

        it('should throw error when invalid salesman ID provided', async () => {
            const invalidId = new mongoose.Types.ObjectId();

            await expect(
                reportService.calculateCommission(
                    invalidId.toString(),
                    '2024-01-01',
                    '2024-01-31'
                )
            ).rejects.toThrow('Salesman not found');
        });

        it('should throw error when start date is missing', async () => {
            await expect(
                reportService.calculateCommission(
                    testSalesman1._id.toString(),
                    null,
                    '2024-01-31'
                )
            ).rejects.toThrow('Start date and end date are required');
        });

        it('should throw error when end date is missing', async () => {
            await expect(
                reportService.calculateCommission(
                    testSalesman1._id.toString(),
                    '2024-01-01',
                    null
                )
            ).rejects.toThrow('Start date and end date are required');
        });

        it('should return empty result when no active salesmen exist', async () => {
            // Deactivate all salesmen
            await Salesman.updateMany({}, { isActive: false });

            const result = await reportService.calculateCommission(
                null,
                '2024-01-01',
                '2024-01-31'
            );

            expect(result.summary.totalSalesmen).toBe(0);
            expect(result.commissionDetails).toHaveLength(0);
            expect(result.summary.totalCommission).toBe(0);
        });
    });

    describe('calculateCommission - Date Range Filtering', () => {
        it('should only include sales within the specified date range', async () => {
            // Create invoice outside date range
            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2023-12-31'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500
                }],
                totals: {
                    subtotal: 1500,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1500
                },
                status: 'confirmed'
            });

            // Create invoice inside date range
            await Invoice.create({
                invoiceNumber: 'INV-002',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 20,
                    unitPrice: 150,
                    lineTotal: 3000
                }],
                totals: {
                    subtotal: 3000,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 3000
                },
                status: 'confirmed'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                { commissionBasis: 'sales' }
            );

            const commission = result.commissionDetails[0];
            expect(commission.sales.totalSales).toBe(3000); // Only INV-002
            expect(commission.sales.commission).toBe(150); // 5% of 3000
        });

        it('should only include collections within the specified date range', async () => {
            // Create receipt outside date range
            await CashReceipt.create({
                receiptNumber: 'REC-001',
                receiptDate: new Date('2023-12-31'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                amount: 1000,
                paymentMethod: 'cash',
                status: 'cleared'
            });

            // Create receipt inside date range
            await CashReceipt.create({
                receiptNumber: 'REC-002',
                receiptDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                amount: 2000,
                paymentMethod: 'cash',
                status: 'cleared'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                { commissionBasis: 'collections' }
            );

            const commission = result.commissionDetails[0];
            expect(commission.collections.totalCollections).toBe(2000); // Only REC-002
            expect(commission.collections.commission).toBe(100); // 5% of 2000
        });
    });

    describe('calculateCommission - Rounding and Precision', () => {
        it('should round commission amounts to 2 decimal places', async () => {
            await Invoice.create({
                invoiceNumber: 'INV-001',
                type: 'sales',
                invoiceDate: new Date('2024-01-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 7,
                    unitPrice: 149.99,
                    lineTotal: 1049.93
                }],
                totals: {
                    subtotal: 1049.93,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1049.93
                },
                status: 'confirmed'
            });

            const result = await reportService.calculateCommission(
                testSalesman1._id.toString(),
                '2024-01-01',
                '2024-01-31',
                { commissionBasis: 'sales' }
            );

            const commission = result.commissionDetails[0];
            // 5% of 1049.93 = 52.4965, should round to 52.50
            expect(commission.sales.commission).toBe(52.50);
            expect(result.summary.totalSalesCommission).toBe(52.50);
        });
    });
});
