const Salesman = require('../models/Salesman');

/**
 * Salesman Service
 * Handles business logic for salesman operations
 */
class SalesmanService {
  /**
   * Create a new salesman
   * @param {Object} salesmanData - Salesman data
   * @returns {Promise<Object>} Created salesman
   */
  async createSalesman(salesmanData) {
    // Validate required fields
    if (!salesmanData.name) {
      throw new Error('Salesman name is required');
    }

    // Check for duplicate code if provided
    if (salesmanData.code) {
      const existing = await Salesman.findOne({ code: salesmanData.code });
      if (existing) {
        throw new Error(`Salesman with code ${salesmanData.code} already exists`);
      }
    }

    const salesman = new Salesman(salesmanData);
    await salesman.save();

    return salesman;
  }

  /**
   * Get all salesmen
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated salesmen
   */
  async getSalesmen(filters = {}, options = {}) {
    const { page = 1, limit = 50, sort = 'name' } = options;
    const skip = (page - 1) * limit;

    const query = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.routeId) {
      query.routeId = filters.routeId;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [salesmen, total] = await Promise.all([
      Salesman.find(query)
        .populate('routeId', 'name code')
        .populate('createdBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Salesman.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      salesmen,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get salesman by ID
   * @param {string} id - Salesman ID
   * @returns {Promise<Object>} Salesman
   */
  async getSalesmanById(id) {
    const salesman = await Salesman.findById(id)
      .populate('routeId', 'name code')
      .populate('createdBy', 'username email');

    if (!salesman) {
      throw new Error('Salesman not found');
    }

    return salesman;
  }

  /**
   * Update salesman
   * @param {string} id - Salesman ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated salesman
   */
  async updateSalesman(id, updateData) {
    const salesman = await Salesman.findById(id);
    if (!salesman) {
      throw new Error('Salesman not found');
    }

    // Check for duplicate code if updating
    if (updateData.code && updateData.code !== salesman.code) {
      const existing = await Salesman.findOne({ code: updateData.code });
      if (existing) {
        throw new Error(`Salesman with code ${updateData.code} already exists`);
      }
    }

    // Update allowed fields
    const allowedFields = ['name', 'code', 'phone', 'email', 'commissionRate', 'routeId', 'isActive'];
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        salesman[field] = updateData[field];
      }
    });

    await salesman.save();

    await salesman.populate('routeId', 'name code');
    await salesman.populate('createdBy', 'username');

    return salesman;
  }

  /**
   * Delete salesman (soft delete)
   * @param {string} id - Salesman ID
   * @returns {Promise<Object>} Deleted salesman
   */
  async deleteSalesman(id) {
    const salesman = await Salesman.findById(id);
    if (!salesman) {
      throw new Error('Salesman not found');
    }

    salesman.isActive = false;
    await salesman.save();

    return salesman;
  }

  /**
   * Get salesman by code
   * @param {string} code - Salesman code
   * @returns {Promise<Object>} Salesman
   */
  async getSalesmanByCode(code) {
    const salesman = await Salesman.findOne({ code: code.toUpperCase() })
      .populate('routeId', 'name code');

    if (!salesman) {
      throw new Error(`Salesman with code ${code} not found`);
    }

    return salesman;
  }
}

module.exports = new SalesmanService();
