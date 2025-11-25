const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Route = require('../../src/models/Route');

// Mock the models
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Route');

describe('Route-wise Reporting - Phase 2 (Requirement 17.3, 17.4, 17.5)', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getRouteSalesReport - Task 58.1', () => {
        const mockRouteId = 'route123';
        const mockRoute = {
            _id: mockRouteId,
            code: 'RT001',
            name: 'Test Route'
        };

        const mockCustomers = [
            { _id: 'cust1', code: 'C001', name: 'Customer 1', routeId: mockRouteId, isActive: true },
            { _id: 'cust2', code: 'C002', name: 'Customer 2', routeId: mockRouteId, isActive: true }
        ];

        it('should generate route sales report with valid data', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            const mockInvoices = [
                {
                    _id: 'inv1',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    salesmanId: { _id: 'sm1', code: 'SM001', name: 'Salesman 1' },
                    invoiceDate: new Date('2024-01-15'),
                    totals: {
                        grandTotal: 10000,
                        totalDiscount: 500,
                        totalTax: 1500
                    }
                },
                {
                    _id: 'inv2',
                    type: 'sales',
                    customerId: { _id: 'cust2', code: 'C002', name: 'Customer 2' },
                    salesmanId: { _id: 'sm1', code: 'SM001', name: 'Salesman 1' },
                    invoiceDate: new Date('2024-01-20'),
                    totals: {
                        grandTotal: 15000,
                        totalDiscount: 750,
                        totalTax: 2250
                    }
                }
            ];

            Route.findById = jest.fn().mockResolvedValue(mockRoute);
            Customer.find = jest.fn().mockResolvedValue(mockCustomers);
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockInvoices)
            });

            const result = await reportService.getRouteSalesReport(mockRouteId, dateRange);

            expect(Route.findById).toHaveBeenCalledWith(mockRouteId);
            expect(Customer.find).toHaveBeenCalledWith({ routeId: mockRouteId, isActive: true });
            expect(result.reportType).toBe('route_sales');
            expect(result.route.code).toBe('RT001');
            expect(result.summary.totalSales).toBe(25000);
            expect(result.summary.salesInvoiceCount).toBe(2);
            expect(result.customerBreakdown).toHaveLength(2);
        });

        it('should throw error when route ID is not provided', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            await expect(reportService.getRouteSalesReport(null, dateRange))
                .rejects.toThrow('Route ID is required');
        });

        it('should throw error when date range is not provided', async () => {
            await expect(reportService.getRouteSalesReport(mockRouteId, null))
                .rejects.toThrow('Date range with startDate and endDate is required');
        });

        it('should throw error when route does not exist', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            Route.findById = jest.fn().mockResolvedValue(null);

            await expect(reportService.getRouteSalesReport(mockRouteId, dateRange))
                .rejects.toThrow('Route not found');
        });

        it('should handle sales returns correctly', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            const mockInvoices = [
                {
                    _id: 'inv1',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    salesmanId: null,
                    invoiceDate: new Date('2024-01-15'),
                    totals: {
                        grandTotal: 10000,
                        totalDiscount: 0,
                        totalTax: 0
                    }
                },
                {
                    _id: 'inv2',
                    type: 'return_sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    salesmanId: null,
                    invoiceDate: new Date('2024-01-20'),
                    totals: {
                        grandTotal: 2000,
                        totalDiscount: 0,
                        totalTax: 0
                    }
                }
            ];

            Route.findById = jest.fn().mockResolvedValue(mockRoute);
            Customer.find = jest.fn().mockResolvedValue(mockCustomers);
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockInvoices)
            });

            const result = await reportService.getRouteSalesReport(mockRouteId, dateRange);

            expect(result.summary.totalSales).toBe(10000);
            expect(result.summary.totalReturns).toBe(2000);
            expect(result.summary.netSales).toBe(8000);
            expect(result.summary.salesInvoiceCount).toBe(1);
            expect(result.summary.returnInvoiceCount).toBe(1);
        });
    });

    describe('getRouteDueInvoices - Task 58.2', () => {
        const mockRouteId = 'route123';
        const mockRoute = {
            _id: mockRouteId,
            code: 'RT001',
            name: 'Test Route'
        };

        const mockCustomers = [
            { _id: 'cust1', code: 'C001', name: 'Customer 1', routeId: mockRouteId, isActive: true }
        ];

        it('should generate route due invoices report with priority sorting', async () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 5);

            const mockInvoices = [
                {
                    _id: 'inv1',
                    invoiceNumber: 'INV001',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    salesmanId: null,
                    invoiceDate: new Date('2024-01-01'),
                    dueDate: yesterday,
                    paymentStatus: 'pending',
                    totals: { grandTotal: 5000 }
                },
                {
                    _id: 'inv2',
                    invoiceNumber: 'INV002',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    salesmanId: null,
                    invoiceDate: new Date('2024-01-10'),
                    dueDate: today,
                    paymentStatus: 'pending',
                    totals: { grandTotal: 3000 }
                },
                {
                    _id: 'inv3',
                    invoiceNumber: 'INV003',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    salesmanId: null,
                    invoiceDate: new Date('2024-01-15'),
                    dueDate: nextWeek,
                    paymentStatus: 'pending',
                    totals: { grandTotal: 2000 }
                }
            ];

            Route.findById = jest.fn().mockResolvedValue(mockRoute);
            Customer.find = jest.fn().mockResolvedValue(mockCustomers);
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockInvoices)
            });

            const result = await reportService.getRouteDueInvoices(mockRouteId);

            expect(Route.findById).toHaveBeenCalledWith(mockRouteId);
            expect(result.reportType).toBe('route_visit_planning');
            expect(result.summary.totalInvoices).toBe(3);
            expect(result.summary.overdueInvoices).toBe(1);
            expect(result.summary.dueTodayInvoices).toBe(1);
            expect(result.visitPlan).toHaveLength(1);
            expect(result.visitPlan[0].highestPriority).toBe('high');
        });

        it('should throw error when route ID is not provided', async () => {
            await expect(reportService.getRouteDueInvoices(null))
                .rejects.toThrow('Route ID is required');
        });

        it('should throw error when route does not exist', async () => {
            Route.findById = jest.fn().mockResolvedValue(null);

            await expect(reportService.getRouteDueInvoices(mockRouteId))
                .rejects.toThrow('Route not found');
        });

        it('should return empty report when no due invoices exist', async () => {
            Route.findById = jest.fn().mockResolvedValue(mockRoute);
            Customer.find = jest.fn().mockResolvedValue(mockCustomers);
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue([])
            });

            const result = await reportService.getRouteDueInvoices(mockRouteId);

            expect(result.summary.totalInvoices).toBe(0);
            expect(result.visitPlan).toHaveLength(0);
            expect(result.allInvoices).toHaveLength(0);
        });
    });

    describe('getRoutePerformance - Task 58.3', () => {
        const mockRouteId = 'route123';
        const mockRoute = {
            _id: mockRouteId,
            code: 'RT001',
            name: 'Test Route',
            salesmanId: { _id: 'sm1', code: 'SM001', name: 'Salesman 1', commissionRate: 5 }
        };

        const mockCustomers = [
            { _id: 'cust1', code: 'C001', name: 'Customer 1', routeId: mockRouteId, isActive: true },
            { _id: 'cust2', code: 'C002', name: 'Customer 2', routeId: mockRouteId, isActive: true }
        ];

        it('should generate route performance report with achievement percentages', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            const targets = {
                salesTarget: 100000,
                collectionTarget: 80000,
                visitTarget: 10
            };

            const mockSalesInvoices = [
                {
                    _id: 'inv1',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    invoiceDate: new Date('2024-01-15'),
                    totals: { grandTotal: 50000 }
                },
                {
                    _id: 'inv2',
                    type: 'sales',
                    customerId: { _id: 'cust2', code: 'C002', name: 'Customer 2' },
                    invoiceDate: new Date('2024-01-20'),
                    totals: { grandTotal: 60000 }
                }
            ];

            const mockPaidInvoices = [
                {
                    _id: 'inv1',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    paymentStatus: 'paid',
                    totals: { grandTotal: 50000 }
                }
            ];

            Route.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockRoute)
            });
            Customer.find = jest.fn().mockResolvedValue(mockCustomers);

            // Mock for sales invoices and paid invoices
            Invoice.find = jest.fn()
                .mockReturnValueOnce({
                    populate: jest.fn().mockReturnThis(),
                    sort: jest.fn().mockResolvedValue(mockSalesInvoices)
                })
                // Mock for paid invoices - return array directly
                .mockResolvedValueOnce(mockPaidInvoices);

            const result = await reportService.getRoutePerformance(mockRouteId, dateRange, targets);

            expect(Route.findById).toHaveBeenCalledWith(mockRouteId);
            expect(result.reportType).toBe('route_performance');
            expect(result.actuals.sales).toBe(110000);
            expect(result.actuals.visits).toBe(2);
            expect(result.achievement.sales.percentage).toBe(110); // 110% achievement
            expect(result.achievement.sales.status).toBe('excellent');
            expect(result.achievement.visits.percentage).toBe(20); // 2/10 = 20%
        });

        it('should throw error when route ID is not provided', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            await expect(reportService.getRoutePerformance(null, dateRange))
                .rejects.toThrow('Route ID is required');
        });

        it('should throw error when date range is not provided', async () => {
            await expect(reportService.getRoutePerformance(mockRouteId, null))
                .rejects.toThrow('Date range with startDate and endDate is required');
        });

        it('should throw error when route does not exist', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            Route.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            await expect(reportService.getRoutePerformance(mockRouteId, dateRange))
                .rejects.toThrow('Route not found');
        });

        it('should handle zero targets gracefully', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            const mockSalesInvoices = [
                {
                    _id: 'inv1',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    invoiceDate: new Date('2024-01-15'),
                    totals: { grandTotal: 50000 }
                }
            ];

            Route.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockRoute)
            });
            Customer.find = jest.fn().mockResolvedValue(mockCustomers);
            Invoice.find = jest.fn()
                .mockReturnValueOnce({
                    populate: jest.fn().mockReturnThis(),
                    sort: jest.fn().mockResolvedValue(mockSalesInvoices)
                })
                .mockResolvedValueOnce([]);

            const result = await reportService.getRoutePerformance(mockRouteId, dateRange, {});

            expect(result.achievement.sales.percentage).toBe(0);
            expect(result.achievement.collection.percentage).toBe(0);
            expect(result.achievement.visits.percentage).toBe(0);
        });

        it('should calculate performance status correctly', async () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            const targets = {
                salesTarget: 100000,
                collectionTarget: 100000,
                visitTarget: 10
            };

            const mockSalesInvoices = [
                {
                    _id: 'inv1',
                    type: 'sales',
                    customerId: { _id: 'cust1', code: 'C001', name: 'Customer 1' },
                    invoiceDate: new Date('2024-01-15'),
                    totals: { grandTotal: 70000 } // 70% of target
                }
            ];

            Route.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockRoute)
            });
            Customer.find = jest.fn().mockResolvedValue(mockCustomers);
            Invoice.find = jest.fn()
                .mockReturnValueOnce({
                    populate: jest.fn().mockReturnThis(),
                    sort: jest.fn().mockResolvedValue(mockSalesInvoices)
                })
                .mockResolvedValueOnce([]);

            const result = await reportService.getRoutePerformance(mockRouteId, dateRange, targets);

            expect(result.achievement.sales.percentage).toBe(70);
            expect(result.achievement.sales.status).toBe('average'); // 60-80% is average
        });
    });
});
