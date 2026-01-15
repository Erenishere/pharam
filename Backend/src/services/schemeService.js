const Scheme = require('../models/Scheme');
const AppError = require('../utils/appError');

/**
 * Scheme Service
 * Handles business logic for scheme management
 */
class SchemeService {
  /**
   * Create a new scheme
   * @param {Object} schemeData - Scheme data
   * @returns {Promise<Object>} Created scheme
   */
  async createScheme(schemeData) {
    try {
      const scheme = await Scheme.create(schemeData);
      return scheme;
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('A scheme with this name already exists', 400);
      }
      throw error;
    }
  }

  /**
   * Get scheme by ID
   * @param {string} id - Scheme ID
   * @returns {Promise<Object>} Scheme document
   */
  async getSchemeById(id) {
    const scheme = await Scheme.findById(id)
      .populate('company', 'name code')
      .populate('claimAccountId', 'name code')
      .populate('applicableItems', 'code name')
      .populate('applicableCustomers', 'code name');

    if (!scheme) {
      throw new AppError('Scheme not found', 404);
    }

    return scheme;
  }

  /**
   * Get all schemes with filtering
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.type] - Scheme type (scheme1/scheme2)
   * @param {string} [filters.company] - Company ID
   * @param {string} [filters.group] - Scheme group
   * @param {boolean} [filters.isActive] - Active status
   * @param {boolean} [filters.currentOnly] - Only currently active schemes (date-wise)
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @returns {Promise<Object>} Paginated result
   */
  async getAllSchemes(filters = {}, options = {}) {
    const query = {};

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.company) {
      query.company = filters.company;
    }

    if (filters.group) {
      query.group = filters.group;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters.currentOnly) {
      const now = new Date();
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.isActive = true;
    }

    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const schemes = await Scheme.find(query)
      .populate('company', 'name code')
      .populate('claimAccountId', 'name code')
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    const total = await Scheme.countDocuments(query);

    return {
      data: schemes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get active schemes
   * @param {string} [companyId] - Optional company ID filter
   * @returns {Promise<Array>} Active schemes
   */
  async getActiveSchemes(companyId = null) {
    return Scheme.getActiveSchemes(companyId);
  }

  /**
   * Get schemes by type
   * @param {string} type - Scheme type (scheme1/scheme2)
   * @param {string} [companyId] - Optional company ID filter
   * @returns {Promise<Array>} Schemes of specified type
   */
  async getSchemesByType(type, companyId = null) {
    if (!['scheme1', 'scheme2'].includes(type)) {
      throw new AppError('Invalid scheme type. Must be scheme1 or scheme2', 400);
    }

    return Scheme.getSchemesByType(type, companyId);
  }

  /**
   * Get schemes by group
   * @param {string} group - Scheme group
   * @param {string} [companyId] - Optional company ID filter
   * @returns {Promise<Array>} Schemes in specified group
   */
  async getSchemesByGroup(group, companyId = null) {
    return Scheme.getSchemesByGroup(group, companyId);
  }

  /**
   * Update a scheme
   * @param {string} id - Scheme ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated scheme
   */
  async updateScheme(id, updateData) {
    const scheme = await Scheme.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!scheme) {
      throw new AppError('Scheme not found', 404);
    }

    return scheme;
  }

  /**
   * Delete a scheme
   * @param {string} id - Scheme ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteScheme(id) {
    const result = await Scheme.findByIdAndDelete(id);

    if (!result) {
      throw new AppError('Scheme not found', 404);
    }

    return true;
  }

  /**
   * Check if item qualifies for scheme
   * @param {string} schemeId - Scheme ID
   * @param {string} itemId - Item ID
   * @param {string} customerId - Customer ID
   * @param {number} quantity - Quantity
   * @returns {Promise<Object>} Qualification result
   */
  async checkSchemeQualification(schemeId, itemId, customerId, quantity) {
    const scheme = await this.getSchemeById(schemeId);

    const result = {
      schemeId,
      schemeName: scheme.name,
      qualifies: false,
      reasons: []
    };

    // Check if scheme is currently active
    if (!scheme.isCurrentlyActive) {
      result.reasons.push('Scheme is not currently active');
      return result;
    }

    // Check item eligibility
    if (!scheme.isItemEligible(itemId)) {
      result.reasons.push('Item is not eligible for this scheme');
      return result;
    }

    // Check customer eligibility
    if (!scheme.isCustomerEligible(customerId)) {
      result.reasons.push('Customer is not eligible for this scheme');
      return result;
    }

    // Check quantity qualification
    if (!scheme.qualifiesForScheme(quantity)) {
      if (quantity < scheme.minimumQuantity) {
        result.reasons.push(`Minimum quantity ${scheme.minimumQuantity} not met`);
      }
      if (scheme.maximumQuantity > 0 && quantity > scheme.maximumQuantity) {
        result.reasons.push(`Quantity exceeds maximum of ${scheme.maximumQuantity}`);
      }
      return result;
    }

    result.qualifies = true;
    result.schemeFormat = scheme.schemeFormat;
    result.discountPercent = scheme.discountPercent;

    return result;
  }

  /**
   * Get applicable schemes for an item and customer
   * @param {string} itemId - Item ID
   * @param {string} customerId - Customer ID
   * @param {string} [companyId] - Optional company ID filter
   * @returns {Promise<Array>} Applicable schemes
   */
  async getApplicableSchemes(itemId, customerId, companyId = null) {
    const query = {
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    };

    if (companyId) {
      query.company = companyId;
    }

    const schemes = await Scheme.find(query);

    return schemes.filter(scheme => {
      return scheme.isItemEligible(itemId) && scheme.isCustomerEligible(customerId);
    });
  }

  /**
   * Calculate scheme bonus
   * @param {string} schemeId - Scheme ID
   * @param {number} quantity - Quantity purchased
   * @returns {Promise<Object>} Bonus calculation result
   */
  async calculateSchemeBonus(schemeId, quantity) {
    const scheme = await this.getSchemeById(schemeId);

    // Parse scheme format (e.g., "12+1" means buy 12 get 1 free)
    const formatMatch = scheme.schemeFormat.match(/(\d+)\+(\d+)/);

    if (!formatMatch) {
      throw new AppError('Invalid scheme format', 400);
    }

    const buyQuantity = parseInt(formatMatch[1], 10);
    const bonusQuantity = parseInt(formatMatch[2], 10);

    const sets = Math.floor(quantity / buyQuantity);
    const totalBonus = sets * bonusQuantity;

    return {
      schemeId,
      schemeName: scheme.name,
      schemeFormat: scheme.schemeFormat,
      purchasedQuantity: quantity,
      buyQuantity,
      bonusQuantity,
      completeSets: sets,
      totalBonusQuantity: totalBonus,
      totalQuantityWithBonus: quantity + totalBonus
    };
  }
}

module.exports = new SchemeService();
