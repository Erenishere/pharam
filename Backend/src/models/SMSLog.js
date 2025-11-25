const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
    recipientType: {
        type: String,
        enum: ['customer', 'supplier', 'other'],
        required: [true, 'Recipient type is required']
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'recipientType',
        validate: {
            validator: function (value) {
                // recipientId is required unless recipientType is 'other'
                if (this.recipientType !== 'other' && !value) {
                    return false;
                }
                return true;
            },
            message: 'Recipient ID is required for customer and supplier types'
        }
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        validate: {
            validator: function (v) {
                // E.164 format validation: +[country code][number]
                // Example: +923001234567 or +14155552671
                return /^\+[1-9]\d{1,14}$/.test(v);
            },
            message: 'Phone number must be in E.164 format (e.g., +923001234567)'
        }
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'delivered'],
        default: 'pending',
        required: true
    },
    sentDate: {
        type: Date
    },
    deliveryStatus: {
        type: String,
        maxlength: [100, 'Delivery status cannot exceed 100 characters']
    },
    errorMessage: {
        type: String,
        maxlength: [500, 'Error message cannot exceed 500 characters']
    },
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sent by user is required']
    },
    relatedInvoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    twilioMessageSid: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
smsLogSchema.index({ recipientId: 1, createdAt: -1 });
smsLogSchema.index({ phoneNumber: 1, createdAt: -1 });
smsLogSchema.index({ status: 1 });
smsLogSchema.index({ sentBy: 1, createdAt: -1 });
smsLogSchema.index({ relatedInvoice: 1 });
smsLogSchema.index({ twilioMessageSid: 1 });

// Virtual for checking if SMS was successful
smsLogSchema.virtual('isSuccessful').get(function () {
    return this.status === 'sent' || this.status === 'delivered';
});

// Pre-save middleware to set sentDate when status changes to 'sent'
smsLogSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'sent' && !this.sentDate) {
        this.sentDate = new Date();
    }
    next();
});

const SMSLog = mongoose.model('SMSLog', smsLogSchema);

module.exports = SMSLog;
