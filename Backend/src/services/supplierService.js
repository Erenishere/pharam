const supplierRepository = require('../repositories/supplierRepository');

/**
 * Supplier Service
 * Handles business logic for supplier management
 */
class SupplierService {
  /**
   * Get supplier by ID
   */
  async getSupplierById(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    return supplier;
  }

  /**
   * Get supplier by code
   */
  async getSupplierByCode(code) {
    const supplier = await supplierRepository.findByCode(code);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    return supplier;
  }

  /**
   * Get all suppliers with advanced filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.keyword] - Search keyword
   * @param {string} [filters.type] - Supplier type
   * @param {string} [filters.city] - City filter
   * @param {string} [filters.state] - State filter
   * @param {string} [filters.country] - Country filter
   * @param {boolean} [filters.isActive] - Active status filter
   * @param {Date} [filters.createdFrom] - Created from date
   * @param {Date} [filters.createdTo] - Created to date
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @param {Object} [options.sort] - Sort criteria
   * @returns {Promise<Object>} - Paginated result with suppliers and pagination info
   */
  async getAllSuppliers(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort, ...otherOptions } = options;
    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      supplierRepository.search(filters, { ...otherOptions, limit, skip, sort }),
      supplierRepository.count(filters)
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      suppliers,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null
      }
    };
  }

  /**
   * Get all active suppliers
   */
  async getActiveSuppliers() {
    return supplierRepository.findAllActive();
  }

  /**
   * Get suppliers by type
   */
  async getSuppliersByType(type) {
    this.validateType(type);
    return supplierRepository.findByType(type);
  }

  /**
   * Create new supplier
   */
  async createSupplier(supplierData) {
    const { code, name, type } = supplierData;

    // Validate required fields
    if (!name) {
      throw new Error('Supplier name is required');
    }

    // Validate type
    if (type) {
      this.validateType(type);
    }

    // Check if code already exists (if provided)
    if (code) {
      const codeExists = await supplierRepository.codeExists(code);
      if (codeExists) {
        throw new Error('Supplier code already exists');
      }
    }

    // Validate credit limit
    if (supplierData.financialInfo?.creditLimit !== undefined) {
      if (supplierData.financialInfo.creditLimit < 0) {
        throw new Error('Credit limit cannot be negative');
      }
    }

    // Validate payment terms
    if (supplierData.financialInfo?.paymentTerms !== undefined) {
      if (supplierData.financialInfo.paymentTerms < 0 || supplierData.financialInfo.paymentTerms > 365) {
        throw new Error('Payment terms must be between 0 and 365 days');
      }
    }

    // Validate email format if provided
    if (supplierData.contactInfo?.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(supplierData.contactInfo.email)) {
        throw new Error('Invalid email format');
      }
    }

    return supplierRepository.create(supplierData);
  }

  /**
   * Update supplier
   */
  async updateSupplier(id, updateData) {
    // Check if supplier exists
    const existingSupplier = await supplierRepository.findById(id);
    if (!existingSupplier) {
      throw new Error('Supplier not found');
    }

    // Validate type if provided
    if (updateData.type) {
      this.validateType(updateData.type);
    }

    // Check code uniqueness if changing code
    if (updateData.code && updateData.code !== existingSupplier.code) {
      const codeExists = await supplierRepository.codeExists(updateData.code, id);
      if (codeExists) {
        throw new Error('Supplier code already exists');
      }
    }

    // Validate credit limit
    if (updateData.financialInfo?.creditLimit !== undefined) {
      if (updateData.financialInfo.creditLimit < 0) {
        throw new Error('Credit limit cannot be negative');
      }
    }

    // Validate payment terms
    if (updateData.financialInfo?.paymentTerms !== undefined) {
      if (updateData.financialInfo.paymentTerms < 0 || updateData.financialInfo.paymentTerms > 365) {
        throw new Error('Payment terms must be between 0 and 365 days');
      }
    }

    // Validate email format if provided
    if (updateData.contactInfo?.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(updateData.contactInfo.email)) {
        throw new Error('Invalid email format');
      }
    }

    return supplierRepository.update(id, updateData);
  }

  /**
   * Delete supplier (soft delete)
   */
  async deleteSupplier(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplierRepository.softDelete(id);
  }

  /**
   * Permanently delete supplier
   */
  async permanentlyDeleteSupplier(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplierRepository.hardDelete(id);
  }

  /**
   * Restore soft-deleted supplier
   */
  async restoreSupplier(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    if (supplier.isActive) {
      throw new Error('Supplier is already active');
    }

    return supplierRepository.restore(id);
  }

  /**
   * Search suppliers
   */
  async searchSuppliers(keyword, options = {}) {
    if (!keyword || keyword.trim().length === 0) {
      throw new Error('Search keyword is required');
    }
    return supplierRepository.search(keyword.trim(), options);
  }

  /**
   * Get paginated suppliers
   */
  async getPaginatedSuppliers(page = 1, limit = 10, filters = {}, sort = { createdAt: -1 }) {
    // Validate pagination parameters
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return supplierRepository.paginate(page, limit, filters, sort);
  }

  /**
   * Get supplier statistics
   */
  async getSupplierStatistics() {
    return supplierRepository.getStatistics();
  }

  /**
   * Get suppliers by payment terms
   */
  async getSuppliersByPaymentTerms(maxTerms = 30) {
    if (maxTerms < 0 || maxTerms > 365) {
      throw new Error('Payment terms must be between 0 and 365 days');
    }
    return supplierRepository.findByPaymentTerms(maxTerms);
  }

  /**
   * Calculate payment due date
   */
  async calculatePaymentDueDate(supplierId, invoiceDate = new Date()) {
    const supplier = await this.getSupplierById(supplierId);
    return supplier.getPaymentDueDate(invoiceDate);
  }

  /**
   * Validate supplier type
   */
  validateType(type) {
    const validTypes = ['customer', 'supplier', 'both'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Bulk create suppliers
   */
  async bulkCreateSuppliers(suppliersData) {
    if (!Array.isArray(suppliersData) || suppliersData.length === 0) {
      throw new Error('Suppliers data must be a non-empty array');
    }

    // Validate each supplier
    const validatedSuppliers = [];
    const errors = [];

    for (let i = 0; i < suppliersData.length; i += 1) {
      const supplierData = suppliersData[i];
      try {
        // Validate required fields
        if (!supplierData.name) {
          throw new Error('Supplier name is required');
        }

        // Validate type
        if (supplierData.type) {
          this.validateType(supplierData.type);
        }

        // Check for duplicate code in batch
        if (supplierData.code) {
          const duplicateCode = validatedSuppliers.find((s) => s.code === supplierData.code);
          if (duplicateCode) {
            throw new Error(`Duplicate code in batch: ${supplierData.code}`);
          }

          // Check if code exists in database
          const codeExists = await supplierRepository.codeExists(supplierData.code);
          if (codeExists) {
            throw new Error(`Code already exists: ${supplierData.code}`);
          }
        }

        // Validate email format if provided
        if (supplierData.contactInfo?.email) {
          const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
          if (!emailRegex.test(supplierData.contactInfo.email)) {
            throw new Error('Invalid email format');
          }
        }

        validatedSuppliers.push(supplierData);
      } catch (error) {
        errors.push({
          index: i,
          name: supplierData.name,
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors.map((e) => `Index ${e.index} (${e.name}): ${e.error}`).join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    return supplierRepository.bulkCreate(validatedSuppliers);
  }

  /**
   * Toggle supplier active status
   */
  async toggleSupplierStatus(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplierRepository.update(id, { isActive: !supplier.isActive });
  }
}

module.exports = new SupplierService();
