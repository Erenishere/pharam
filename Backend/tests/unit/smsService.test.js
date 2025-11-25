const smsService = require('../../src/services/smsService');
const SMSLog = require('../../src/models/SMSLog');
const mongoose = require('mongoose');

// Mock Twilio
jest.mock('twilio', () => {
    return jest.fn(() => ({
        messages: {
            create: jest.fn()
        }
    }));
});

describe('SMS Service', () => {
    let userId;

    beforeEach(() => {
        userId = new mongoose.Types.ObjectId();
        jest.clearAllMocks();
    });

    describe('validatePhoneNumber', () => {
        it('should validate correct E.164 phone numbers', () => {
            const validNumbers = [
                '+923001234567',
                '+14155552671',
                '+442071838750',
                '+61291234567'
            ];

            validNumbers.forEach(number => {
                const result = smsService.validatePhoneNumber(number);
                expect(result.valid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });
        });

        it('should reject phone numbers without + prefix', () => {
            const result = smsService.validatePhoneNumber('923001234567');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Phone number must be in E.164 format (e.g., +923001234567)');
        });

        it('should reject empty phone numbers', () => {
            const result = smsService.validatePhoneNumber('');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Phone number cannot be empty');
        });

        it('should reject non-string phone numbers', () => {
            const result = smsService.validatePhoneNumber(123456);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Phone number must be a string');
        });
    });

    describe('getSMSTemplates', () => {
        it('should return array of templates', () => {
            const templates = smsService.getSMSTemplates();

            expect(Array.isArray(templates)).toBe(true);
            expect(templates.length).toBeGreaterThan(0);

            templates.forEach(template => {
                expect(template).toHaveProperty('id');
                expect(template).toHaveProperty('name');
                expect(template).toHaveProperty('message');
                expect(template).toHaveProperty('variables');
            });
        });

        it('should include invoice_reminder template', () => {
            const templates = smsService.getSMSTemplates();
            const reminderTemplate = templates.find(t => t.id === 'invoice_reminder');

            expect(reminderTemplate).toBeDefined();
            expect(reminderTemplate.variables).toContain('customerName');
            expect(reminderTemplate.variables).toContain('invoiceNo');
            expect(reminderTemplate.variables).toContain('amount');
        });
    });

    describe('renderTemplate', () => {
        it('should render template with variables', () => {
            const message = smsService.renderTemplate('invoice_reminder', {
                customerName: 'John Doe',
                invoiceNo: 'INV-001',
                amount: '5000'
            });

            expect(message).toContain('John Doe');
            expect(message).toContain('INV-001');
            expect(message).toContain('5000');
            expect(message).not.toContain('{{');
        });

        it('should throw error for non-existent template', () => {
            expect(() => {
                smsService.renderTemplate('non_existent', {});
            }).toThrow('Template not found');
        });

        it('should throw error for missing variables', () => {
            expect(() => {
                smsService.renderTemplate('invoice_reminder', {
                    customerName: 'John Doe'
                    // Missing invoiceNo and amount
                });
            }).toThrow('Missing variables');
        });
    });

    describe('sendSMS', () => {
        beforeEach(async () => {
            await SMSLog.deleteMany({});

            // Mock environment variables
            process.env.TWILIO_ACCOUNT_SID = 'test_sid';
            process.env.TWILIO_AUTH_TOKEN = 'test_token';
            process.env.TWILIO_PHONE_NUMBER = '+14155552671';

            // Reinitialize Twilio client
            smsService.initializeTwilioClient();
        });

        it('should throw error for invalid phone number', async () => {
            await expect(
                smsService.sendSMS('invalid', 'Test message', { sentBy: userId })
            ).rejects.toThrow('Invalid phone number');
        });

        it('should throw error for empty message', async () => {
            await expect(
                smsService.sendSMS('+923001234567', '', { sentBy: userId })
            ).rejects.toThrow('Message cannot be empty');
        });

        it('should throw error for message exceeding 500 characters', async () => {
            const longMessage = 'A'.repeat(501);

            await expect(
                smsService.sendSMS('+923001234567', longMessage, { sentBy: userId })
            ).rejects.toThrow('Message cannot exceed 500 characters');
        });

        it('should throw error if sentBy is not provided', async () => {
            await expect(
                smsService.sendSMS('+923001234567', 'Test message', {})
            ).rejects.toThrow('sentBy (user ID) is required');
        });
    });

    describe('getSMSHistory', () => {
        it('should return SMS history for an account', async () => {
            const accountId = new mongoose.Types.ObjectId();

            await SMSLog.create([
                {
                    recipientType: 'customer',
                    recipientId: accountId,
                    phoneNumber: '+923001234567',
                    message: 'Message 1',
                    status: 'sent',
                    sentBy: userId
                },
                {
                    recipientType: 'customer',
                    recipientId: accountId,
                    phoneNumber: '+923001234567',
                    message: 'Message 2',
                    status: 'delivered',
                    sentBy: userId
                }
            ]);

            const history = await smsService.getSMSHistory(accountId);

            expect(history).toHaveLength(2);
            expect(history[0].message).toBe('Message 2'); // Most recent first
            expect(history[1].message).toBe('Message 1');
        });

        it('should filter SMS history by date range', async () => {
            const accountId = new mongoose.Types.ObjectId();

            const sms1 = await SMSLog.create({
                recipientType: 'customer',
                recipientId: accountId,
                phoneNumber: '+923001234567',
                message: 'Old message',
                status: 'sent',
                sentBy: userId,
                createdAt: new Date('2024-01-01')
            });

            const sms2 = await SMSLog.create({
                recipientType: 'customer',
                recipientId: accountId,
                phoneNumber: '+923001234567',
                message: 'New message',
                status: 'sent',
                sentBy: userId,
                createdAt: new Date('2024-06-01')
            });

            const history = await smsService.getSMSHistory(accountId, {
                startDate: '2024-05-01',
                endDate: '2024-12-31'
            });

            expect(history).toHaveLength(1);
            expect(history[0].message).toBe('New message');
        });
    });

    describe('getSMSStats', () => {
        it('should return SMS statistics for an account', async () => {
            const accountId = new mongoose.Types.ObjectId();

            await SMSLog.create([
                {
                    recipientType: 'customer',
                    recipientId: accountId,
                    phoneNumber: '+923001234567',
                    message: 'Message 1',
                    status: 'sent',
                    sentBy: userId
                },
                {
                    recipientType: 'customer',
                    recipientId: accountId,
                    phoneNumber: '+923001234567',
                    message: 'Message 2',
                    status: 'delivered',
                    sentBy: userId
                },
                {
                    recipientType: 'customer',
                    recipientId: accountId,
                    phoneNumber: '+923001234567',
                    message: 'Message 3',
                    status: 'failed',
                    sentBy: userId
                },
                {
                    recipientType: 'customer',
                    recipientId: accountId,
                    phoneNumber: '+923001234567',
                    message: 'Message 4',
                    status: 'pending',
                    sentBy: userId
                }
            ]);

            const stats = await smsService.getSMSStats(accountId);

            expect(stats.total).toBe(4);
            expect(stats.sent).toBe(2); // sent + delivered
            expect(stats.failed).toBe(1);
            expect(stats.pending).toBe(1);
        });
    });
});
