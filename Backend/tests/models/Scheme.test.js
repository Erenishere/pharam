/**
 * Unit Tests for Scheme Model Extensions
 * Phase 2 - Requirement 21: Scheme and Discount Claim System
 * Task 65.1: Extend SchemeDefinition model - Unit Tests
 */

const mongoose = require('mongoose');
const Scheme = require('../../src/models/Scheme');
const Company = require('../../src/models/Company');
const Account = require('../../src/models/Account');

describe('Scheme Model - Extended Fields (Task 65.1)', () => {
    let testCompany;
    let testClaimAccount;
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

        // Create test claim account
        testClaimAccount = await Account.create({
            code: 'CLAIM001',
            name: 'Scheme Claim Account',
            type: 'liability',
            isActive: true,
            balance: 0,
            createdBy: testUserId
        });
    });

    afterEach(async () => {
        await Scheme.deleteMany({});
        await Company.deleteMany({});
        await Account.deleteMany({});
    });

    describe('Schema Validation', () => {
        it('should create scheme with all new fields', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme with All Fields',
                type: 'scheme1',
                company: testCompany._id,
                group: 'Group A',
                schemeFormat: '12+1',
                discountPercent: 5,
                discount2Percent: 7.69,
                to2Percent: 2,
                claimAccountId: testClaimAccount._id,
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme).toBeDefined();
            expect(scheme.discount2Percent).toBe(7.69);
            expect(scheme.to2Percent).toBe(2);
            expect(scheme.claimAccountId.toString()).toBe(testClaimAccount._id.toString());
        });

        it('should have default value of 0 for discount2Percent', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Default Discount2',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.discount2Percent).toBe(0);
        });

        it('should have default value of 0 for to2Percent', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Default TO2',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.to2Percent).toBe(0);
        });

        it('should validate discount2Percent is not negative', async () => {
            await expect(
                Scheme.create({
                    name: 'Test Scheme Negative Discount2',
                    type: 'scheme1',
                    company: testCompany._id,
                    schemeFormat: '12+1',
                    discount2Percent: -5,
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    createdBy: testUserId
                })
            ).rejects.toThrow();
        });

        it('should validate discount2Percent does not exceed 100', async () => {
            await expect(
                Scheme.create({
                    name: 'Test Scheme Excessive Discount2',
                    type: 'scheme1',
                    company: testCompany._id,
                    schemeFormat: '12+1',
                    discount2Percent: 150,
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    createdBy: testUserId
                })
            ).rejects.toThrow();
        });

        it('should validate to2Percent is not negative', async () => {
            await expect(
                Scheme.create({
                    name: 'Test Scheme Negative TO2',
                    type: 'scheme1',
                    company: testCompany._id,
                    schemeFormat: '12+1',
                    to2Percent: -2,
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    createdBy: testUserId
                })
            ).rejects.toThrow();
        });

        it('should validate to2Percent does not exceed 100', async () => {
            await expect(
                Scheme.create({
                    name: 'Test Scheme Excessive TO2',
                    type: 'scheme1',
                    company: testCompany._id,
                    schemeFormat: '12+1',
                    to2Percent: 120,
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    createdBy: testUserId
                })
            ).rejects.toThrow();
        });

        it('should allow decimal values for discount2Percent', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Decimal Discount2',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                discount2Percent: 7.69,
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.discount2Percent).toBe(7.69);
        });

        it('should allow decimal values for to2Percent', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Decimal TO2',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                to2Percent: 2.5,
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.to2Percent).toBe(2.5);
        });
    });

    describe('Claim Account Linking', () => {
        it('should link claim account to scheme', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme with Claim Account',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                claimAccountId: testClaimAccount._id,
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.claimAccountId).toBeDefined();
            expect(scheme.claimAccountId.toString()).toBe(testClaimAccount._id.toString());
        });

        it('should populate claim account details', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Populate Claim',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                claimAccountId: testClaimAccount._id,
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            const populatedScheme = await Scheme.findById(scheme._id)
                .populate('claimAccountId');

            expect(populatedScheme.claimAccountId.name).toBe('Scheme Claim Account');
            expect(populatedScheme.claimAccountId.code).toBe('CLAIM001');
        });

        it('should allow scheme without claim account', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme No Claim Account',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.claimAccountId).toBeUndefined();
        });
    });

    describe('Scheme Format Validation', () => {
        it('should accept valid scheme format "12+1"', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Format 12+1',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.schemeFormat).toBe('12+1');
        });

        it('should accept valid scheme format "10+2"', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Format 10+2',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '10+2',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.schemeFormat).toBe('10+2');
        });

        it('should accept valid scheme format "24+3"', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Format 24+3',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '24+3',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.schemeFormat).toBe('24+3');
        });
    });

    describe('Combined Discount and TO Configuration', () => {
        it('should support both discount2 and to2 in same scheme', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Combined',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                discountPercent: 5,
                discount2Percent: 7.69,
                to2Percent: 2,
                claimAccountId: testClaimAccount._id,
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.discountPercent).toBe(5);
            expect(scheme.discount2Percent).toBe(7.69);
            expect(scheme.to2Percent).toBe(2);
            expect(scheme.claimAccountId.toString()).toBe(testClaimAccount._id.toString());
        });
    });

    describe('Group and Company Filtering', () => {
        it('should create scheme with group', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme with Group',
                type: 'scheme1',
                company: testCompany._id,
                group: 'Premium Products',
                schemeFormat: '12+1',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.group).toBe('Premium Products');
        });

        it('should link scheme to company', async () => {
            const scheme = await Scheme.create({
                name: 'Test Scheme Company Link',
                type: 'scheme1',
                company: testCompany._id,
                schemeFormat: '12+1',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: testUserId
            });

            expect(scheme.company.toString()).toBe(testCompany._id.toString());
        });
    });
});
