// Create mock data
supplier = new mongoose.Types.ObjectId();
item = new mongoose.Types.ObjectId();
    });

describe('getDimensionReport', () => {
    it('should generate report for specific dimension', async () => {
        // Create invoices with dimension
        await Invoice.create([
            {
                type: 'purchase',
                dimension: 'PROJECT-A',
                supplierId: supplier,
                invoiceDate: new Date('2024-01-15'),
                items: [{ itemId: item, quantity: 10, unitPrice: 100, lineTotal: 1000 }],
                totals: { grandTotal: 1000 },
                status: 'confirmed'
            },
            {
                type: 'purchase',
                dimension: 'PROJECT-A',
                supplierId: supplier,
                invoiceDate: new Date('2024-01-20'),
                items: [{ itemId: item, quantity: 5, unitPrice: 100, lineTotal: 500 }],
                totals: { grandTotal: 500 },
                status: 'confirmed'
            },
            {
                type: 'purchase',
                dimension: 'PROJECT-B', // Different dimension
                supplierId: supplier,
                invoiceDate: new Date('2024-01-25'),
                items: [{ itemId: item, quantity: 2, unitPrice: 100, lineTotal: 200 }],
                totals: { grandTotal: 200 },
                status: 'confirmed'
            }
        ]);

        const report = await reportService.getDimensionReport('PROJECT-A', {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
        });

        expect(report.dimension).toBe('PROJECT-A');
        expect(report.summary.totalInvoices).toBe(2);
        expect(report.summary.totalAmount).toBe(1500);
        expect(report.summary.purchaseAmount).toBe(1500);
    });

    it('should handle return invoices correctly', async () => {
        await Invoice.create([
            {
                type: 'purchase',
                dimension: 'PROJECT-A',
                supplierId: supplier,
                invoiceDate: new Date('2024-01-15'),
                items: [{ itemId: item, quantity: 10, unitPrice: 100, lineTotal: 1000 }],
                totals: { grandTotal: 1000 },
                status: 'confirmed'
            },
            {
                type: 'return_purchase',
                dimension: 'PROJECT-A',
                supplierId: supplier,
                invoiceDate: new Date('2024-01-20'),
                items: [{ itemId: item, quantity: 2, unitPrice: 100, lineTotal: 200 }],
                totals: { grandTotal: 200 },
                status: 'confirmed'
            }
        ]);

        const report = await reportService.getDimensionReport('PROJECT-A', {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
        });

        expect(report.summary.totalInvoices).toBe(2);
        expect(report.summary.totalAmount).toBe(800); // 1000 - 200
        expect(report.summary.purchaseAmount).toBe(1000);
        expect(report.summary.returnAmount).toBe(200);
    });
});

describe('getDimensionExpenses', () => {
    it('should aggregate expenses by dimension', async () => {
        await Invoice.create([
            {
                type: 'purchase',
                dimension: 'DEPT-1',
                invoiceDate: new Date('2024-01-15'),
                totals: { grandTotal: 1000 },
                status: 'confirmed'
            },
            {
                type: 'purchase',
                dimension: 'DEPT-2',
                invoiceDate: new Date('2024-01-20'),
                totals: { grandTotal: 2000 },
                status: 'confirmed'
            },
            {
                type: 'purchase',
                dimension: 'DEPT-1',
                invoiceDate: new Date('2024-01-25'),
                totals: { grandTotal: 500 },
                status: 'confirmed'
            }
        ]);

        const report = await reportService.getDimensionExpenses({
            startDate: '2024-01-01',
            endDate: '2024-01-31'
        });

        expect(report.summary.totalDimensions).toBe(2);
        expect(report.summary.totalExpenses).toBe(3500);

        const dept1 = report.dimensions.find(d => d.dimension === 'DEPT-1');
        const dept2 = report.dimensions.find(d => d.dimension === 'DEPT-2');

        expect(dept1.totalAmount).toBe(1500);
        expect(dept1.invoiceCount).toBe(2);
        expect(dept2.totalAmount).toBe(2000);
        expect(dept2.invoiceCount).toBe(1);
    });
});

describe('compareDimensionBudget', () => {
    it('should compare actuals against budget', async () => {
        // Create budget
        await Budget.create({
            dimension: 'PROJECT-X',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 10000,
            allocatedBy: new mongoose.Types.ObjectId()
        });

        // Create expenses
        await Invoice.create([
            {
                type: 'purchase',
                dimension: 'PROJECT-X',
                invoiceDate: new Date('2024-01-15'),
                totals: { grandTotal: 6000 },
                status: 'confirmed'
            },
            {
                type: 'purchase',
                dimension: 'PROJECT-X',
                invoiceDate: new Date('2024-02-15'),
                totals: { grandTotal: 3000 },
                status: 'confirmed'
            }
        ]);

        const report = await reportService.compareDimensionBudget('PROJECT-X', {
            startDate: '2024-01-01',
            endDate: '2024-03-31'
        });

        expect(report.actuals.amount).toBe(9000);
        expect(report.budget.amount).toBe(10000);
        expect(report.comparison.variance).toBe(1000);
        expect(report.comparison.utilizationPercent).toBe(90);
        expect(report.comparison.status).toBe('near_limit');
    });

    it('should handle over budget scenario', async () => {
        await Budget.create({
            dimension: 'PROJECT-Y',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 5000,
            allocatedBy: new mongoose.Types.ObjectId()
        });

        await Invoice.create({
            type: 'purchase',
            dimension: 'PROJECT-Y',
            invoiceDate: new Date('2024-01-15'),
            totals: { grandTotal: 6000 },
            status: 'confirmed'
        });

        const report = await reportService.compareDimensionBudget('PROJECT-Y', {
            startDate: '2024-01-01',
            endDate: '2024-03-31'
        });

        expect(report.comparison.status).toBe('over_budget');
        expect(report.comparison.variance).toBe(-1000);
    });

    it('should handle missing budget', async () => {
        await Invoice.create({
            type: 'purchase',
            dimension: 'PROJECT-Z',
            invoiceDate: new Date('2024-01-15'),
            totals: { grandTotal: 1000 },
            status: 'confirmed'
        });

        const report = await reportService.compareDimensionBudget('PROJECT-Z', {
            startDate: '2024-01-01',
            endDate: '2024-03-31'
        });

        expect(report.budget).toBeNull();
        expect(report.comparison).toBeNull();
    });
});
});
