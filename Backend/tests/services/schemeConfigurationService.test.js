/**
 * Unit Tests for Scheme Configuration Service
 * Phase 2 - Requirement 21: Scheme and Discount Claim System
 * Tasks 65.2, 65.3, 65.4, 65.5: Unit Tests
 */

const mongoose = require('mongoose');
const schemeConfigurationService = require('../../src/services/schemeConfigurationService');
const schemeService = require('../../src/services/schemeService');
const ledgerService = require('../../src/services/ledgerService');
const Scheme = require('../../src/models/Scheme');
const Account = require('../../src/models/Account');
const Company = require('../../src/models/Company');
const Customer = require('../../src/models/Customer');

// Mock the services
jest.mock('../../src/services/ledgerService');
jest.mock('../../src/services/schemeService');

describe('Scheme Configuration Service', () => {
    let testCompany;
    let testCustomer;
    let testClaimAccount;
    let testScheme;
    let testUserId;

    beforeEach(async () => {
        testUserId = new mongoose.Types.ObjectId();

        // Create test company
        testCompany = await Company.create({
            code: 'COMP001',
            name: 'Test Company',
            isActive: true,
            createdBy: testUserId
        });

        // Create test customer
        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            email: 'test@customer.com',
            company: testCompany._id,
            group: 'Group A',
            schemeFormat: '12+1',
            discountPercent: 5,
            discount2Percent: 7.69,
            to2Percent: 2,
            claimAccountId: testClaimAccount._id,
            isActive: true,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            minimumQuantity: 12,
            createdBy: testUserId
        });

        jest.clearAllMocks();
    });

    afterEach(async () => {
        await Company.deleteMany({});
        await Customer.deleteMany({});
        await Account.deleteMany({});
        await Scheme.deleteMany({});
    });

    describe('calculateSchemeBonus - Task 65.2', () => {
        it('should calculate bonus for "12+1" format correctly', () => {
            const result = schemeConfigurationService.calculateSchemeBonus(24, '12+1');

            expect(result.purchasedQuantity).toBe(24);
            expect(result.buyQuantity).toBe(12);
            expect(result.bonusPerSet).toBe(1);
            expect(result.completeSets).toBe(2);
            expect(result.bonusQuantity).toBe(2);
            expect(result.totalQuantity).toBe(26);
        });

        it('should calculate bonus for "10+2" format correctly', () => {
            const result = schemeConfigurationService.calculateSchemeBonus(30, '10+2');

            expect(result.purchasedQuantity).toBe(30);
            expect(result.buyQuantity).toBe(10);
            expect(result.bonusPerSet).toBe(2);
            expect(result.completeSets).toBe(3);
            expect(result.bonusQuantity).toBe(6);
            expect(result.totalQuantity).toBe(36);
        });

        it('should handle partial sets correctly', () => {
            const result = schemeConfigurationService.calculateSchemeBonus(15, '12+1');

            expect(result.completeSets).toBe(1);
            expect(result.bonusQuantity).toBe(1);
            expect(result.totalQuantity).toBe(16);
        });

        it('should return zero bonus if quantity is below threshold', () => {
            const result = schemeConfigurationService.calculateSchemeBonus(5, '12+1');

            expect(result.completeSets).toBe(0);
            expect(result.bonusQuantity).toBe(0);
            expect(result.totalQuantity).toBe(5);
        });

        it('should throw error for invalid scheme format', () => {
            expect(() => {
                schemeConfigurationService.calculateSchemeBonus(12, 'invalid');
            }).toThrow('Invalid scheme format');
        });

        it('should throw error if scheme format is missing', () => {
            expect(() => {
                schemeConfigurationService.calculateSchemeBonus(12, null);
            }).toThrow('Scheme format is required');
        });

        it('should handle zero quantity', () => {
            const result = schemeConfigurationService.calculateSchemeBonus(0, '12+1');

            expect(result.bonusQuantity).toBe(0);
            expect(result.totalQuantity).toBe(0);
        });
    });

    describe('applySchemeToItem - Task 65.3', () => {
        let testItem;

        beforeEach(() => {
            testItem = {
                itemId: new mongoose.Types.ObjectId(),
                quantity: 24,
                unitPrice: 100,
                lineTotal: 2400,
                scheme1Quantity: 0,
                scheme2Quantity: 0
            };
        });

        it('should apply scheme1 bonus quantity correctly', () => {
            const result = schemeConfigurationService.applySchemeToItem(
                testItem,
                testScheme,
                24
            );

            expect(result.scheme1Quantity).toBe(2);
            expect(result.schemeApplied.bonusQuantity).toBe(2);
            expect(result.schemeApplied.schemeFormat).toBe('12+1');
        });

        it('should calculate discount2 if configured', () => {
            const result = schemeConfigurationService.applySchemeToItem(
                testItem,
                testScheme,
                24
            );

            expect(result.discount2Percent).toBe(7.69);
            expect(result.discount2Amount).toBeCloseTo(184.56, 1);
        });

        it('should include scheme details in result', () => {
            const result = schemeConfigurationService.applySchemeToItem(
                testItem,
                testScheme,
                24
            );

            expect(result.schemeApplied).toBeDefined();
            expect(result.schemeApplied.schemeName).toBe('Test Scheme 12+1');
            expect(result.schemeApplied.schemeType).toBe('scheme1');
            expect(result.schemeApplied.discount2Percent).toBe(7.69);
            expect(result.schemeApplied.to2Percent).toBe(2);
        });

        it('should throw error if item is not provided', () => {
            expect(() => {
                schemeConfigurationService.applySchemeToItem(null, testScheme, 24);
            }).toThrow('Item is required');
        });

        it('should throw error if scheme is not provided', () => {
            expect(() => {
                schemeConfigurationService.applySchemeToItem(testItem, null, 24);
            }).toThrow('Scheme is required');
        });
    });

    describe('validateClaimAccount - Task 65.4', () => {
        it('should validate and return active claim account', async () => {
            const account = await schemeConfigurationService.validateClaimAccount(
                testClaimAccount._id
            );

            expect(account).toBeDefined();
            expect(account._id.toString()).toBe(testClaimAccount._id.toString());
            expect(account.isActive).toBe(true);
        });

        it('should throw error if account ID is not provided', async () => {
            await expect(
                schemeConfigurationService.validateClaimAccount(null)
            ).rejects.toThrow('Claim account ID is required');
        });

        it('should throw error if account does not exist', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(
                schemeConfigurationService.validateClaimAccount(fakeId)
            ).rejects.toThrow('Claim account not found');
        });

        it('should throw error if account is not active', async () => {
            testClaimAccount.isActive = false;
            await testClaimAccount.save();

            await expect(
                schemeConfigurationService.validateClaimAccount(testClaimAccount._id)
            ).rejects.toThrow('Claim account is not active');
        });
    });

    describe('createSchemeClaimEntries - Task 65.4', () => {
        let testInvoice;

        beforeEach(() => {
            ledgerService.createDoubleEntry.mockResolvedValue({
                debit: { accountId: testClaimAccount._id, amount: 200 },
                credit: { accountId: testCustomer._id, amount: 200 }
            });

            testInvoice = {
                _id: new mongoose.Types.ObjectId(),
                invoiceNumber: 'SI2025000001',
                customerId: testCustomer._id,
                claimAccountId: testClaimAccount._id,
                items: [
                    {
                        itemId: new mongoose.Types.ObjectId(),
                        quantity: 24,
                        unitPrice: 100,
                        lineTotal: 2400,
                        discount2Amount: 184.56
                    }
                ],
                to2Amount: 48,
                totals: {
                    subtotal: 2400,
                    grandTotal: 2167.44
                }
            };
        });

        it('should create ledger entries for scheme claims', async () => {
            const result = await schemeConfigurationService.createSchemeClaimEntries(
                testInvoice,
                testUserId
            );

            expect(result.entries).toHaveLength(1);
            expect(result.totalAmount).toBeCloseTo(232.56, 1);
            expect(ledgerService.createDoubleEntry).toHaveBeenCalledTimes(1);
        });

        it('should return empty entries if no claim amounts', async () => {
            testInvoice.items[0].discount2Amount = 0;
            testInvoice.to2Amount = 0;

            const result = await schemeConfigurationService.createSchemeClaimEntries(
                testInvoice,
                testUserId
            );

            expect(result.entries).toHaveLength(0);
            expect(result.totalAmount).toBe(0);
            expect(ledgerService.createDoubleEntry).not.toHaveBeenCalled();
        });

        it('should throw error if invoice is not provided', async () => {
            await expect(
                schemeConfigurationService.createSchemeClaimEntries(null, testUserId)
            ).rejects.toThrow('Invoice is required');
        });

        it('should throw error if user ID is not provided', async () => {
            await expect(
                schemeConfigurationService.createSchemeClaimEntries(testInvoice, null)
            ).rejects.toThrow('User ID is required');
        });

        it('should throw error if claim account is not set', async () => {
            testInvoice.claimAccountId = null;

            await expect(
                schemeConfigurationService.createSchemeClaimEntries(testInvoice, testUserId)
            ).rejects.toThrow('Claim account is required when schemes are applied');
        });
    });

    describe('getActiveSchemes - Task 65.5', () => {
        beforeEach(() => {
            // Mock Scheme.getActiveSchemes to return test scheme
            jest.spyOn(Scheme, 'getActiveSchemes').mockResolvedValue([testScheme]);
            jest.spyOn(Scheme, 'populate').mockResolvedValue([testScheme]);
        });

        it('should return active schemes for company', async () => {
            const schemes = await schemeConfigurationService.getActiveSchemes(
                testCompany._id
            );

            expect(schemes).toBeDefined();
            expect(Array.isArray(schemes)).toBe(true);
            expect(Scheme.getActiveSchemes).toHaveBeenCalledWith(testCompany._id);
        });

        it('should include all scheme details', async () => {
            const schemes = await schemeConfigurationService.getActiveSchemes(
                testCompany._id
            );

            const scheme = schemes[0];
            expect(scheme.name).toBe('Test Scheme 12+1');
            expect(scheme.schemeFormat).toBe('12+1');
            expect(scheme.discount2Percent).toBe(7.69);
            expect(scheme.to2Percent).toBe(2);
        });

        it('should throw error if company ID is not provided', async () => {
            await expect(
                schemeConfigurationService.getActiveSchemes(null)
            ).rejects.toThrow('Company ID is required');
        });
    });

    describe('calculateSchemeImpact', () => {
        let testInvoice;

        beforeEach(() => {
            testInvoice = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: new mongoose.Types.ObjectId(),
                        quantity: 24,
                        unitPrice: 100,
                        lineTotal: 2400
                    },
                    {
                        itemId: new mongoose.Types.ObjectId(),
                        quantity: 36,
                        unitPrice: 50,
                        lineTotal: 1800
                    }
                ]
            };
        });

        it('should calculate total scheme impact', () => {
            const result = schemeConfigurationService.calculateSchemeImpact(
                testInvoice,
                testScheme
            );

            expect(result.schemeId).toBeDefined();
            expect(result.schemeName).toBe('Test Scheme 12+1');
            expect(result.totalBonusQuantity).toBeGreaterThan(0);
            expect(result.affectedItems).toBeDefined();
        });

        it('should throw error if invoice or scheme is missing', () => {
            expect(() => {
                schemeConfigurationService.calculateSchemeImpact(null, testScheme);
            }).toThrow('Invoice and scheme are required');

            expect(() => {
                schemeConfigurationService.calculateSchemeImpact(testInvoice, null);
            }).toThrow('Invoice and scheme are required');
        });
    });
});
