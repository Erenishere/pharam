/**
 * Salesman Controller - Salesman-Specific Methods
 * These methods allow salesmen to access their own data
 */

const Salesman = require('../models/Salesman');
const Invoice = require('../models/Invoice');
const reportService = require('../services/reportService');

/**
 * Get logged-in salesman's profile
 * @route GET /api/salesmen/me
 * @access Private (sales role)
 */
const getMyProfile = async (req, res, next) => {
    try {
        // Find salesman linked to this user
        const salesman = await Salesman.findOne({ userId: req.user._id })
            .populate('routeId', 'code name');

        if (!salesman) {
            // Auto-create if user has sales role but profile is missing
            if (req.user.role === 'sales') {
                const newSalesman = await Salesman.create({
                    name: req.user.username,
                    email: req.user.email,
                    userId: req.user._id,
                    commissionRate: 0,
                    isActive: true,
                });
                console.log(`Auto-initialized missing salesman profile for user: ${req.user.username}`);
                return res.json({
                    success: true,
                    data: newSalesman,
                    message: 'Profile initialized and retrieved successfully',
                });
            }

            return res.status(404).json({
                success: false,
                message: 'Salesman profile not found. Please contact administrator.',
            });
        }

        res.json({
            success: true,
            data: salesman,
            message: 'Profile retrieved successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get logged-in salesman's invoices
 * @route GET /api/salesmen/my-invoices
 * @access Private (sales role)
 */
const getMyInvoices = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, startDate, endDate } = req.query;

        // Find salesman linked to this user
        const salesman = await Salesman.findOne({ userId: req.user._id });

        if (!salesman) {
            return res.status(404).json({
                success: false,
                message: 'Salesman profile not found',
            });
        }

        // Build query
        const query = { salesmanId: salesman._id };
        if (status) query.status = status;
        if (startDate || endDate) {
            query.invoiceDate = {};
            if (startDate) query.invoiceDate.$gte = new Date(startDate);
            if (endDate) query.invoiceDate.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [invoices, total] = await Promise.all([
            Invoice.find(query)
                .populate('customerId', 'name code phone')
                .populate('warehouseId', 'name code')
                .sort({ invoiceDate: -1 })
                .limit(parseInt(limit))
                .skip(skip),
            Invoice.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: invoices,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                itemsPerPage: parseInt(limit),
            },
            message: 'Invoices retrieved successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get logged-in salesman's commission
 * @route GET /api/salesmen/my-commission
 * @access Private (sales role)
 */
const getMyCommission = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required',
            });
        }

        const salesman = await Salesman.findOne({ userId: req.user._id });

        if (!salesman) {
            return res.status(404).json({
                success: false,
                message: 'Salesman profile not found',
            });
        }

        // Calculate commission using report service
        const commission = await reportService.calculateCommission(
            salesman._id,
            { startDate: new Date(startDate), endDate: new Date(endDate) }
        );

        res.json({
            success: true,
            data: commission,
            message: 'Commission calculated successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get logged-in salesman's performance stats
 * @route GET /api/salesmen/my-performance
 * @access Private (sales role)
 */
const getMyPerformance = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const salesman = await Salesman.findOne({ userId: req.user._id });

        if (!salesman) {
            return res.status(404).json({
                success: false,
                message: 'Salesman profile not found',
            });
        }

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.invoiceDate = {};
            if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
            if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
        }

        // Get performance statistics
        const [
            totalInvoices,
            confirmedInvoices,
            totalSales,
            paidInvoices,
            pendingAmount,
        ] = await Promise.all([
            Invoice.countDocuments({ salesmanId: salesman._id, ...dateFilter }),
            Invoice.countDocuments({ salesmanId: salesman._id, status: 'confirmed', ...dateFilter }),
            Invoice.aggregate([
                { $match: { salesmanId: salesman._id, status: 'confirmed', ...dateFilter } },
                { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } },
            ]),
            Invoice.countDocuments({ salesmanId: salesman._id, paymentStatus: 'paid', ...dateFilter }),
            Invoice.aggregate([
                { $match: { salesmanId: salesman._id, paymentStatus: { $ne: 'paid' }, ...dateFilter } },
                { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                salesmanName: salesman.name,
                salesmanCode: salesman.code,
                period: { startDate, endDate },
                stats: {
                    totalInvoices,
                    confirmedInvoices,
                    totalSales: totalSales[0]?.total || 0,
                    paidInvoices,
                    pendingAmount: pendingAmount[0]?.total || 0,
                    averageInvoiceValue: confirmedInvoices > 0
                        ? (totalSales[0]?.total || 0) / confirmedInvoices
                        : 0,
                },
            },
            message: 'Performance stats retrieved successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Export salesman-specific methods
module.exports = {
    getMyProfile,
    getMyInvoices,
    getMyCommission,
    getMyPerformance,
};
