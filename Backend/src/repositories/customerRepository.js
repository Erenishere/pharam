const Customer = require('../models/Customer');

/**
 * Customer Repository
 * Handles database operations for customers
 */
class CustomerRepository {
  /**
   * Find customer by ID
   */
  async findById(id) {
    return Customer.findById(id);
  }

  /**
   * Find customer by code
   */
  async findByCode(code) {
    return Customer.findOne({ code: code.toUpperCase() });
  }

  /**
   * Find all customers with filters
   */
  async findAll(filters = {}, options = {}) {
    const query = Customer.find(filters);
    
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
   * Find all active customers
   */
  async findAllActive() {
    return Customer.find({ isActive: true }).sort({ name: 1 });
  }

  /**
   * Find customers by type
   */
  async findByType(type) {
    return Customer.findByType(type);
  }

  /**
   * Search customers with advanced filtering options
   * @param {Object} filters - Filter criteria
   * @param {string} filters.keyword - Search keyword
   * @param {string} filters.type - Customer type (individual, business, etc.)
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
   * @returns {Promise<Array>} - List of matching customers
   */
  async search(filters = {}, options = {}) {
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
      ];
    }

    // Exact match filters
    if (type) query.type = type;
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

    const queryBuilder = Customer.find(query);

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
   * Count customers matching the given filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} - Count of matching customers
   */
  async count(filters = {}) {
    return Customer.countDocuments(filters);
  }

  /**
   * Create new customer
   */
  async create(customerData) {
    const customer = new Customer(customerData);
    return customer.save();
  }

  /**
   * Update customer
   */
  async update(id, updateData) {
    return Customer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Soft delete customer
   */
  async softDelete(id) {
    return Customer.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );
  }

  /**
   * Hard delete customer
   */
  async hardDelete(id) {
    return Customer.findByIdAndDelete(id);
  }

  /**
   * Restore soft-deleted customer
   */
  async restore(id) {
    return Customer.findByIdAndUpdate(
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
    const customer = await Customer.findOne(query);
    return !!customer;
  }

  /**
   * Get paginated customers
   */
  async paginate(page = 1, limit = 10, filters = {}, sort = { createdAt: -1 }) {
    const skip = (page - 1) * limit;
    
    const [customers, total] = await Promise.all([
      Customer.find(filters).sort(sort).skip(skip).limit(limit),
      Customer.countDocuments(filters),
    ]);

    return {
      customers,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get customer statistics
   */
  async getStatistics() {
    const [total, active, inactive, byType] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      Customer.countDocuments({ isActive: false }),
      Customer.aggregate([
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
   * Find customers with credit limit
   */
  async findWithCreditLimit(minLimit = 0) {
    return Customer.findWithCreditLimit(minLimit);
  }

  /**
   * Bulk create customers
   */
  async bulkCreate(customersData) {
    return Customer.insertMany(customersData);
  }
}

module.exports = new CustomerRepository();
