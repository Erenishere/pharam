const mongoose = require('mongoose');
const SMSLog = require('../../src/models/SMSLog');
const User = require('../../src/models/User');

describe('SMSLog Model', () => {
    let user;

    beforeEach(async () => {
        await SMSLog.deleteMany({});
        await User.deleteMany({});

        // Create a test user
        user = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'admin'
        });
    });

    describe('SMSLog Creation', () => {
        it('should create an SMS log with valid data', async () => {
            const smsLog = await SMSLog.create({
                recipientType: 'customer',
                recipientId: new mongoose.Types.ObjectId(),
                phoneNumber: '+923001234567',
                message: 'Test message',
                status: 'sent',
                sentBy: user._id
            });

            expect(smsLog.recipientType).toBe('customer');
            expect(smsLog.phoneNumber).toBe('+923001234567');
            expect(smsLog.message).toBe('Test message');
            expect(smsLog.status).toBe('sent');
        });

        it('should require recipientType field', async () => {
            const smsLog = new SMSLog({
                phoneNumber: '+923001234567',
                message: 'Test message',
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow('Recipient type is required');
        });

        it('should require phoneNumber field', async () => {
            const smsLog = new SMSLog({
                recipientType: 'customer',
                message: 'Test message',
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow('Phone number is required');
        });

        it('should require message field', async () => {
            const smsLog = new SMSLog({
                recipientType: 'customer',
                phoneNumber: '+923001234567',
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow('Message is required');
        });

        it('should require sentBy field', async () => {
            const smsLog = new SMSLog({
                recipientType: 'customer',
                phoneNumber: '+923001234567',
                message: 'Test message'
            });

            await expect(smsLog.save()).rejects.toThrow('Sent by user is required');
        });
    });

    describe('Phone Number Validation', () => {
        it('should accept valid E.164 phone numbers', async () => {
            const validNumbers = [
                '+923001234567',
                '+14155552671',
                '+442071838750',
                '+61291234567'
            ];

            for (const phoneNumber of validNumbers) {
                const smsLog = await SMSLog.create({
                    recipientType: 'other',
                    phoneNumber,
                    message: 'Test message',
                    sentBy: user._id
                });

                expect(smsLog.phoneNumber).toBe(phoneNumber);
            }
        });

        it('should reject phone numbers without + prefix', async () => {
            const smsLog = new SMSLog({
                recipientType: 'other',
                phoneNumber: '923001234567',
                message: 'Test message',
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow('E.164 format');
        });

        it('should reject phone numbers with invalid characters', async () => {
            const smsLog = new SMSLog({
                recipientType: 'other',
                phoneNumber: '+92-300-1234567',
                message: 'Test message',
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow('E.164 format');
        });

        it('should reject phone numbers that are too long', async () => {
            const smsLog = new SMSLog({
                recipientType: 'other',
                phoneNumber: '+9230012345678901234',
                message: 'Test message',
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow('E.164 format');
        });
    });

    describe('Status Enum Validation', () => {
        it('should accept valid status values', async () => {
            const validStatuses = ['pending', 'sent', 'failed', 'delivered'];

            for (const status of validStatuses) {
                const smsLog = await SMSLog.create({
                    recipientType: 'other',
                    phoneNumber: '+923001234567',
                    message: 'Test message',
                    status,
                    sentBy: user._id
                });

                expect(smsLog.status).toBe(status);
                await SMSLog.deleteMany({});
            }
        });

        it('should reject invalid status values', async () => {
            const smsLog = new SMSLog({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message: 'Test message',
                status: 'invalid_status',
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow();
        });

        it('should default status to pending', async () => {
            const smsLog = await SMSLog.create({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message: 'Test message',
                sentBy: user._id
            });

            expect(smsLog.status).toBe('pending');
        });
    });

    describe('Message Length Validation', () => {
        it('should accept messages up to 500 characters', async () => {
            const message = 'A'.repeat(500);
            const smsLog = await SMSLog.create({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message,
                sentBy: user._id
            });

            expect(smsLog.message).toBe(message);
        });

        it('should reject messages exceeding 500 characters', async () => {
            const message = 'A'.repeat(501);
            const smsLog = new SMSLog({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message,
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow('cannot exceed 500 characters');
        });
    });

    describe('Recipient Type Validation', () => {
        it('should accept valid recipient types', async () => {
            const validTypes = ['customer', 'supplier', 'other'];

            for (const recipientType of validTypes) {
                const smsLog = await SMSLog.create({
                    recipientType,
                    recipientId: recipientType !== 'other' ? new mongoose.Types.ObjectId() : undefined,
                    phoneNumber: '+923001234567',
                    message: 'Test message',
                    sentBy: user._id
                });

                expect(smsLog.recipientType).toBe(recipientType);
                await SMSLog.deleteMany({});
            }
        });

        it('should reject invalid recipient types', async () => {
            const smsLog = new SMSLog({
                recipientType: 'invalid_type',
                phoneNumber: '+923001234567',
                message: 'Test message',
                sentBy: user._id
            });

            await expect(smsLog.save()).rejects.toThrow();
        });
    });

    describe('Timestamps', () => {
        it('should automatically add createdAt and updatedAt timestamps', async () => {
            const smsLog = await SMSLog.create({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message: 'Test message',
                sentBy: user._id
            });

            expect(smsLog.createdAt).toBeDefined();
            expect(smsLog.updatedAt).toBeDefined();
            expect(smsLog.createdAt).toBeInstanceOf(Date);
            expect(smsLog.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe('Pre-save Middleware', () => {
        it('should set sentDate when status changes to sent', async () => {
            const smsLog = await SMSLog.create({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message: 'Test message',
                status: 'pending',
                sentBy: user._id
            });

            expect(smsLog.sentDate).toBeUndefined();

            smsLog.status = 'sent';
            await smsLog.save();

            expect(smsLog.sentDate).toBeDefined();
            expect(smsLog.sentDate).toBeInstanceOf(Date);
        });
    });

    describe('Virtual Fields', () => {
        it('should return true for isSuccessful when status is sent', async () => {
            const smsLog = await SMSLog.create({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message: 'Test message',
                status: 'sent',
                sentBy: user._id
            });

            expect(smsLog.isSuccessful).toBe(true);
        });

        it('should return true for isSuccessful when status is delivered', async () => {
            const smsLog = await SMSLog.create({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message: 'Test message',
                status: 'delivered',
                sentBy: user._id
            });

            expect(smsLog.isSuccessful).toBe(true);
        });

        it('should return false for isSuccessful when status is failed', async () => {
            const smsLog = await SMSLog.create({
                recipientType: 'other',
                phoneNumber: '+923001234567',
                message: 'Test message',
                status: 'failed',
                sentBy: user._id
            });

            expect(smsLog.isSuccessful).toBe(false);
        });
    });
});
