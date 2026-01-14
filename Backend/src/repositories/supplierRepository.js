const Supplier = require('../models/Supplier');

/**
 * Supplier Repository
 * Handles database operations for suppliers
 */
class SupplierRepository {
  /**
   * Find supplier by ID
   */
  async findById(id) {
    return Supplier.findById(id);
  }

  /**
   * Find supplier by code
   */
  async findByCode(code) {
    return Supplier.findOne({ code: code.toUpperCase() });
  }

  /**
   * Find all suppliers with filters
   */
  async findAll(filters = {}, options = {}) {
    const query = Supplier.find(filters);

    if (options.sort) {
      query.sort(options.sort);
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.skip) {
      query.skip(options.skip);
    }

    return query.exec();
  }

  /**
   * Find all active suppliers
   */
  async findAllActive() {
    return Supplier.find({ isActive: true }).sort({ name: 1 });
  }

  /**
   * Find suppliers by type
   */
  async findByType(type) {
    return Supplier.findByType(type);
  }

  /**
   * Build MongoDB query from filter criteria
   * @param {Object} filters - Filter criteria
   * @returns {Object} - MongoDB query object
   * @private
   */
  _buildQuery(filters = {}) {
    const {
      keyword,
      type,
      city,
      state,
      country,
      isActive,
      createdFrom,
      createdTo,
      ...otherFilters
    } = filters;

    const query = {};

    // Text search across multiple fields
    if (keyword) {
      const searchRegex = new RegExp(keyword, 'i');
      query.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { 'contactInfo.email': searchRegex },
        { 'contactInfo.phone': searchRegex },
        { 'contactInfo.city': searchRegex },
        { 'contactInfo.addressLine1': searchRegex },
        { 'contactInfo.contactPerson': searchRegex },
        { 'taxInfo.gstin': searchRegex },
        { 'bankDetails.accountNumber': searchRegex },
      ];
    }

    // Exact match filters - with inclusive logic for 'both'
    if (type) {
      if (type === 'customer') {
        query.type = { $in: ['customer', 'both'] };
      } else if (type === 'supplier') {
        query.type = { $in: ['supplier', 'both'] };
      } else {
        query.type = type;
      }
    }
    if (isActive !== undefined) query.isActive = isActive;
    if (city) query['contactInfo.city'] = new RegExp(`^${city}$`, 'i');
    if (state) query['contactInfo.state'] = new RegExp(`^${state}$`, 'i');
    if (country) query['contactInfo.country'] = new RegExp(`^${country}$`, 'i');

    // Date range filter
    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
      if (createdTo) query.createdAt.$lte = new Date(createdTo);
    }

    // Additional filters
    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query[key] = value;
      }
    });

    return query;
  }

  /**
   * Search suppliers with advanced filtering options
   * @param {Object} filters - Filter criteria
   * @param {string} filters.keyword - Search keyword
   * @param {string} filters.type - Supplier type (wholesaler, manufacturer, etc.)
   * @param {string} filters.city - City filter
   * @param {string} filters.state - State filter
   * @param {string} filters.country - Country filter
   * @param {boolean} filters.isActive - Active status filter
   * @param {Date} filters.createdFrom - Created date from
   * @param {Date} filters.createdTo - Created date to
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.skip - Number of results to skip
   * @param {Object} options.sort - Sort criteria
   * @returns {Promise<Array>} - List of matching suppliers
   */
  async search(filters = {}, options = {}) {
    const query = this._buildQuery(filters);

    const queryBuilder = Supplier.find(query);

    // Apply sorting
    if (options.sort) {
      queryBuilder.sort(options.sort);
    } else {
      // Default sorting
      queryBuilder.sort({ name: 1 });
    }

    // Apply pagination
    if (options.limit) {
      queryBuilder.limit(parseInt(options.limit, 10));
    }
    if (options.skip) {
      queryBuilder.skip(parseInt(options.skip, 10));
    }

    return queryBuilder.exec();
  }

  /**
   * Count suppliers matching the given filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} - Count of matching suppliers
   */
  async count(filters = {}) {
    const query = this._buildQuery(filters);
    return Supplier.countDocuments(query);
  }

  /**
   * Create new supplier
   */
  async create(supplierData) {
    const supplier = new Supplier(supplierData);
    return supplier.save();
  }

  /**
   * Update supplier
   */
  async update(id, updateData) {
    return Supplier.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Soft delete supplier
   */
  async softDelete(id) {
    return Supplier.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );
  }

  /**
   * Hard delete supplier
   */
  async hardDelete(id) {
    return Supplier.findByIdAndDelete(id);
  }

  /**
   * Restore soft-deleted supplier
   */
  async restore(id) {
    return Supplier.findByIdAndUpdate(
      id,
      { $set: { isActive: true } },
      { new: true }
    );
  }

  /**
   * Check if code exists
   */
  async codeExists(code, excludeId = null) {
    const query = { code: code.toUpperCase() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const supplier = await Supplier.findOne(query);
    return !!supplier;
  }

  /**
   * Get paginated suppliers
   */
  async paginate(page = 1, limit = 10, filters = {}, sort = { createdAt: -1 }) {
    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      Supplier.find(filters).sort(sort).skip(skip).limit(limit),
      Supplier.countDocuments(filters),
    ]);

    return {
      suppliers,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get supplier statistics
   */
  async getStatistics() {
    const [total, active, inactive, byType] = await Promise.all([
      Supplier.countDocuments(),
      Supplier.countDocuments({ isActive: true }),
      Supplier.countDocuments({ isActive: false }),
      Supplier.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const typeStats = {};
    byType.forEach((item) => {
      typeStats[item._id] = item.count;
    });

    return {
      total,
      active,
      inactive,
      byType: typeStats,
    };
  }

  /**
   * Find suppliers by payment terms
   */
  async findByPaymentTerms(maxTerms = 30) {
    return Supplier.findByPaymentTerms(maxTerms);
  }

  /**
   * Bulk create suppliers
   */
  async bulkCreate(suppliersData) {
    return Supplier.insertMany(suppliersData);
  }
}

module.exports = new SupplierRepository();
