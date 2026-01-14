const searchService = require('../../src/services/searchService');
const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const User = require('../../src/models/User');

describe('Search Service', () => {
    let user;

    beforeEach(async () => {
        await Invoice.deleteMany({});
        await User.deleteMany({});

        user = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'admin'
        });
    });

    describe('buildSearchQuery', () => {
        it('should build query for equals operator', () => {
            const filters = [
                { field: 'status', operator: 'equals', value: 'confirmed' }
            ];

            const query = searchService.buildSearchQuery(filters);

            expect(query).toEqual({
                status: { $eq: 'confirmed' }
            });
        });

        it('should build query for contains operator', () => {
            const filters = [
                { field: 'invoiceNo', operator: 'contains', value: 'INV' }
            ];

            const query = searchService.buildSearchQuery(filters);

            expect(query).toEqual({
                invoiceNo: { $regex: 'INV', $options: 'i' }
            });
        });

        it('should build query for startsWith operator', () => {
            const filters = [
                { field: 'invoiceNo', operator: 'startsWith', value: 'SI' }
            ];

            const query = searchService.buildSearchQuery(filters);

            expect(query).toEqual({
                invoiceNo: { $regex: '^SI', $options: 'i' }
            });
        });

        it('should build query for endsWith operator', () => {
            const filters = [
                { field: 'invoiceNo', operator: 'endsWith', value: '001' }
            ];

            const query = searchService.buildSearchQuery(filters);

            expect(query).toEqual({
                invoiceNo: { $regex: '001$', $options: 'i' }
            });
        });

        it('should build query for gt operator', () => {
            const filters = [
                { field: 'totals.grandTotal', operator: 'gt', value: 1000 }
            ];

            const query = searchService.buildSearchQuery(filters);

            expect(query).toEqual({
                'totals.grandTotal': { $gt: 1000 }
            });
        });

        it('should build query for between operator', () => {
            const filters = [
                { field: 'totals.grandTotal', operator: 'between', value: [1000, 5000] }
            ];

            const query = searchService.buildSearchQuery(filters);

            expect(query).toEqual({
                'totals.grandTotal': { $gte: 1000, $lte: 5000 }
            });
        });

        it('should build query for in operator', () => {
            const filters = [
                { field: 'status', operator: 'in', value: ['confirmed', 'paid'] }
            ];

            const query = searchService.buildSearchQuery(filters);

            expect(query).toEqual({
                status: { $in: ['confirmed', 'paid'] }
            });
        });

        it('should build query for multiple filters', () => {
            const filters = [
                { field: 'status', operator: 'equals', value: 'confirmed' },
                { field: 'totals.grandTotal', operator: 'gt', value: 1000 }
            ];

            const query = searchService.buildSearchQuery(filters);

            expect(query).toEqual({
                status: { $eq: 'confirmed' },
                'totals.grandTotal': { $gt: 1000 }
            });
        });

        it('should throw error for invalid operator', () => {
            const filters = [
                { field: 'status', operator: 'invalidOp', value: 'confirmed' }
            ];

            expect(() => searchService.buildSearchQuery(filters)).toThrow('Invalid operator');
        });
    });

    describe('applyTextSearch', () => {
        it('should apply text search across multiple fields', () => {
            const query = {};
            const searchText = 'test';
            const fields = ['invoiceNo', 'notes'];

            const result = searchService.applyTextSearch(query, searchText, fields);

            expect(result).toEqual({
                $or: [
                    { invoiceNo: { $regex: 'test', $options: 'i' } },
                    { notes: { $regex: 'test', $options: 'i' } }
                ]
            });
        });

        it('should combine with existing query', () => {
            const query = { status: 'confirmed' };
            const searchText = 'test';
            const fields = ['invoiceNo'];

            const result = searchService.applyTextSearch(query, searchText, fields);

            expect(result).toEqual({
                $and: [
                    { status: 'confirmed' },
                    { $or: [{ invoiceNo: { $regex: 'test', $options: 'i' } }] }
                ]
            });
        });

        it('should return original query if no search text', () => {
            const query = { status: 'confirmed' };
            const result = searchService.applyTextSearch(query, '', ['invoiceNo']);

            expect(result).toEqual(query);
        });
    });

    describe('buildSortObject', () => {
        it('should build sort object for single field', () => {
            const sortCriteria = [
                { field: 'invoiceDate', order: 'desc' }
            ];

            const sort = searchService.buildSortObject(sortCriteria);

            expect(sort).toEqual({
                invoiceDate: -1
            });
        });

        it('should build sort object for multiple fields', () => {
            const sortCriteria = [
                { field: 'invoiceDate', order: 'desc' },
                { field: 'invoiceNo', order: 'asc' }
            ];

            const sort = searchService.buildSortObject(sortCriteria);

            expect(sort).toEqual({
                invoiceDate: -1,
                invoiceNo: 1
            });
        });

        it('should default to ascending order', () => {
            const sortCriteria = [
                { field: 'invoiceNo', order: 'invalid' }
            ];

            const sort = searchService.buildSortObject(sortCriteria);

            expect(sort).toEqual({
                invoiceNo: 1
            });
        });
    });

    describe('searchRecords', () => {
        beforeEach(async () => {
            // Create test invoices
            await Invoice.create([
                {
                    type: 'sale',
                    invoiceNo: 'SI-001',
                    invoiceDate: new Date('2024-01-01'),
                    status: 'confirmed',
                    totals: { grandTotal: 1000 },
                    items: [],
                    createdBy: user._id
                },
                {
                    type: 'sale',
                    invoiceNo: 'SI-002',
                    invoiceDate: new Date('2024-01-02'),
                    status: 'draft',
                    totals: { grandTotal: 2000 },
                    items: [],
                    createdBy: user._id
                },
                {
                    type: 'sale',
                    invoiceNo: 'SI-003',
                    invoiceDate: new Date('2024-01-03'),
                    status: 'confirmed',
                    totals: { grandTotal: 3000 },
                    items: [],
                    createdBy: user._id
                }
            ]);
        });

        it('should search with filters', async () => {
            const result = await searchService.searchRecords(Invoice, {
                filters: [
                    { field: 'status', operator: 'equals', value: 'confirmed' }
                ]
            });

            expect(result.results).toHaveLength(2);
            expect(result.pagination.total).toBe(2);
        });

        it('should search with text search', async () => {
            const result = await searchService.searchRecords(Invoice, {
                searchText: 'SI-001',
                searchFields: ['invoiceNo']
            });

            expect(result.results).toHaveLength(1);
            expect(result.results[0].invoiceNo).toBe('SI-001');
        });

        it('should apply sorting', async () => {
            const result = await searchService.searchRecords(Invoice, {
                sort: [
                    { field: 'totals.grandTotal', order: 'desc' }
                ]
            });

            expect(result.results[0].totals.grandTotal).toBe(3000);
            expect(result.results[2].totals.grandTotal).toBe(1000);
        });

        it('should apply pagination', async () => {
            const result = await searchService.searchRecords(Invoice, {
                page: 1,
                limit: 2
            });

            expect(result.results).toHaveLength(2);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(2);
            expect(result.pagination.total).toBe(3);
            expect(result.pagination.pages).toBe(2);
            expect(result.pagination.hasNext).toBe(true);
            expect(result.pagination.hasPrev).toBe(false);
        });

        it('should limit max results per page to 100', async () => {
            const result = await searchService.searchRecords(Invoice, {
                limit: 200
            });

            expect(result.pagination.limit).toBe(100);
        });
    });

    describe('validateSearchCriteria', () => {
        it('should validate valid search criteria', () => {
            const criteria = {
                filters: [],
                sort: [],
                page: 1,
                limit: 50,
                searchFields: ['invoiceNo']
            };

            const result = searchService.validateSearchCriteria(criteria);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid filters type', () => {
            const criteria = {
                filters: 'invalid'
            };

            const result = searchService.validateSearchCriteria(criteria);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Filters must be an array');
        });

        it('should reject invalid page number', () => {
            const criteria = {
                page: -1
            };

            const result = searchService.validateSearchCriteria(criteria);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Page must be a positive number');
        });

        it('should reject limit exceeding 100', () => {
            const criteria = {
                limit: 150
            };

            const result = searchService.validateSearchCriteria(criteria);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Limit must be between 1 and 100');
        });
    });

    describe('getAvailableOperators', () => {
        it('should return array of operators', () => {
            const operators = searchService.getAvailableOperators();

            expect(Array.isArray(operators)).toBe(true);
            expect(operators.length).toBeGreaterThan(0);

            operators.forEach(op => {
                expect(op).toHaveProperty('value');
                expect(op).toHaveProperty('label');
                expect(op).toHaveProperty('types');
            });
        });

        it('should include common operators', () => {
            const operators = searchService.getAvailableOperators();
            const operatorValues = operators.map(op => op.value);

            expect(operatorValues).toContain('equals');
            expect(operatorValues).toContain('contains');
            expect(operatorValues).toContain('gt');
            expect(operatorValues).toContain('lt');
            expect(operatorValues).toContain('between');
        });
    });
});
