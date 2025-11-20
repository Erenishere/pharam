const schemeService = require('../services/schemeService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Create a new scheme
 * POST /api/schemes
 */
exports.createScheme = catchAsync(async (req, res, next) => {
  const schemeData = {
    ...req.body,
    createdBy: req.user._id
  };

  const scheme = await schemeService.createScheme(schemeData);

  res.status(201).json({
    status: 'success',
    data: {
      scheme
    }
  });
});

/**
 * Get all schemes with filtering and pagination
 * GET /api/schemes
 */
exports.getAllSchemes = catchAsync(async (req, res, next) => {
  const filters = {
    type: req.query.type,
    company: req.query.company,
    group: req.query.group,
    isActive: req.query.isActive,
    currentOnly: req.query.currentOnly === 'true'
  };

  const options = {
    page: req.query.page,
    limit: req.query.limit
  };

  const result = await schemeService.getAllSchemes(filters, options);

  res.status(200).json({
    status: 'success',
    results: result.data.length,
    pagination: result.pagination,
    data: result.data
  });
});

/**
 * Get scheme by ID
 * GET /api/schemes/:id
 */
exports.getSchemeById = catchAsync(async (req, res, next) => {
  const scheme = await schemeService.getSchemeById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      scheme
    }
  });
});

/**
 * Get schemes by company
 * GET /api/schemes/company/:companyId
 */
exports.getSchemesByCompany = catchAsync(async (req, res, next) => {
  const filters = {
    company: req.params.companyId,
    type: req.query.type,
    isActive: req.query.isActive,
    currentOnly: req.query.currentOnly === 'true'
  };

  const options = {
    page: req.query.page,
    limit: req.query.limit
  };

  const result = await schemeService.getAllSchemes(filters, options);

  res.status(200).json({
    status: 'success',
    results: result.data.length,
    pagination: result.pagination,
    data: result.data
  });
});

/**
 * Update a scheme
 * PUT /api/schemes/:id
 */
exports.updateScheme = catchAsync(async (req, res, next) => {
  const updateData = {
    ...req.body,
    updatedBy: req.user._id
  };

  const scheme = await schemeService.updateScheme(req.params.id, updateData);

  res.status(200).json({
    status: 'success',
    data: {
      scheme
    }
  });
});

/**
 * Delete a scheme
 * DELETE /api/schemes/:id
 */
exports.deleteScheme = catchAsync(async (req, res, next) => {
  await schemeService.deleteScheme(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * Check if item qualifies for scheme
 * POST /api/schemes/:id/qualify
 * Body: { itemId, customerId, quantity }
 */
exports.checkSchemeQualification = catchAsync(async (req, res, next) => {
  const { itemId, customerId, quantity } = req.body;

  if (!itemId || !customerId || !quantity) {
    return next(new AppError('itemId, customerId, and quantity are required', 400));
  }

  const result = await schemeService.checkSchemeQualification(
    req.params.id,
    itemId,
    customerId,
    quantity
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Get applicable schemes for an item and customer
 * POST /api/schemes/applicable
 * Body: { itemId, customerId, companyId? }
 */
exports.getApplicableSchemes = catchAsync(async (req, res, next) => {
  const { itemId, customerId, companyId } = req.body;

  if (!itemId || !customerId) {
    return next(new AppError('itemId and customerId are required', 400));
  }

  const schemes = await schemeService.getApplicableSchemes(itemId, customerId, companyId);

  res.status(200).json({
    status: 'success',
    results: schemes.length,
    data: schemes
  });
});

/**
 * Calculate scheme bonus
 * POST /api/schemes/:id/calculate-bonus
 * Body: { quantity }
 */
exports.calculateSchemeBonus = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return next(new AppError('Valid quantity is required', 400));
  }

  const result = await schemeService.calculateSchemeBonus(req.params.id, quantity);

  res.status(200).json({
    status: 'success',
    data: result
  });
});
