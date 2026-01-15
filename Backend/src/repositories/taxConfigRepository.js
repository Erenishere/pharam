const TaxConfig = require('../models/TaxConfig');

class TaxConfigRepository {
  /**
   * Create a new tax configuration
   */
  async create(taxData) {
    const taxConfig = new TaxConfig(taxData);
    return await taxConfig.save();
  }

  /**
   * Find tax configuration by ID
   */
  async findById(id) {
    return await TaxConfig.findById(id);
  }

  /**
   * Find tax configuration by code
   */
  async findByCode(code) {
    return await TaxConfig.findOne({ code: code.toUpperCase() });
  }

  /**
   * Find all tax configurations
   */
  async findAll(filters = {}) {
    const query = {};
    
    if (filters.type) {
      query.type = filters.type;
    }
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.applicableOn) {
      query.applicableOn = { $in: [filters.applicableOn, 'both'] };
    }
    
    return await TaxConfig.find(query).sort({ type: 1, rate: 1 });
  }

  /**
   * Find active tax configurations
   */
  async findActive(type = null) {
    return await TaxConfig.findActiveTaxes(type);
  }

  /**
   * Find effective tax configurations for a specific date
   */
  async findEffective(date = new Date(), type = null) {
    return await TaxConfig.findEffectiveTaxes(date, type);
  }

  /**
   * Get default tax by type
   */
  async getDefault(type) {
    return await TaxConfig.getDefaultTax(type);
  }

  /**
   * Find taxes by category
   */
  async findByCategory(category) {
    return await TaxConfig.findByCategory(category);
  }

  /**
   * Update tax configuration
   */
  async update(id, updateData) {
    return await TaxConfig.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete tax configuration
   */
  async delete(id) {
    return await TaxConfig.findByIdAndDelete(id);
  }

  /**
   * Activate tax configuration
   */
  async activate(id) {
    const taxConfig = await TaxConfig.findById(id);
    if (!taxConfig) {
      throw new Error('Tax configuration not found');
    }
    return await taxConfig.activate();
  }

  /**
   * Deactivate tax configuration
   */
  async deactivate(id) {
    const taxConfig = await TaxConfig.findById(id);
    if (!taxConfig) {
      throw new Error('Tax configuration not found');
    }
    return await taxConfig.deactivate();
  }

  /**
   * Set tax as default for its type
   */
  async setAsDefault(id) {
    const taxConfig = await TaxConfig.findById(id);
    if (!taxConfig) {
      throw new Error('Tax configuration not found');
    }
    return await taxConfig.setAsDefault();
  }

  /**
   * Check if tax code exists
   */
  async codeExists(code, excludeId = null) {
    const query = { code: code.toUpperCase() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await TaxConfig.countDocuments(query);
    return count > 0;
  }

  /**
   * Get tax statistics
   */
  async getStatistics() {
    const stats = await TaxConfig.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ['$isActive', 1, 0] },
          },
          avgRate: { $avg: '$rate' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    
    return stats;
  }
}

module.exports = new TaxConfigRepository();
