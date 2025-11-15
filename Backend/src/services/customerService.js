const customerRepository = require('../repositories/customerRepository');

/**
 * Customer Service
 * Handles business logic for customer management
 */
class CustomerService {
  /**
   * Get customer by ID
   */
  async getCustomerById(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  /**
   * Get customer by code
   */
  async getCustomerByCode(code) {
    const customer = await customerRepository.findByCode(code);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  /**
   * Get all customers with advanced filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.keyword] - Search keyword
   * @param {string} [filters.type] - Customer type
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
   * @returns {Promise<Object>} - Paginated result with customers and pagination info
   */
  async getAllCustomers(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort, ...otherOptions } = options;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      customerRepository.search(filters, { ...otherOptions, limit, skip, sort }),
      customerRepository.count(filters)
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      customers,
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
   * Get all active customers
   */
  async getActiveCustomers() {
    return customerRepository.findAllActive();
  }

  /**
   * Get customers by type
   */
  async getCustomersByType(type) {
    this.validateType(type);
    return customerRepository.findByType(type);
  }

  /**
   * Create new customer
   */
  async createCustomer(customerData) {
    const { code, name, type } = customerData;

    // Validate required fields
    if (!name) {
      throw new Error('Customer name is required');
    }

    // Validate type
    if (type) {
      this.validateType(type);
    }

    // Check if code already exists (if provided)
    if (code) {
      const codeExists = await customerRepository.codeExists(code);
      if (codeExists) {
        throw new Error('Customer code already exists');
      }
    }

    // Validate credit limit
    if (customerData.financialInfo?.creditLimit !== undefined) {
      if (customerData.financialInfo.creditLimit < 0) {
        throw new Error('Credit limit cannot be negative');
      }
    }

    // Validate payment terms
    if (customerData.financialInfo?.paymentTerms !== undefined) {
      if (customerData.financialInfo.paymentTerms < 0 || customerData.financialInfo.paymentTerms > 365) {
        throw new Error('Payment terms must be between 0 and 365 days');
      }
    }

    // Validate email format if provided
    if (customerData.contactInfo?.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(customerData.contactInfo.email)) {
        throw new Error('Invalid email format');
      }
    }

    return customerRepository.create(customerData);
  }

  /**
   * Update customer
   */
  async updateCustomer(id, updateData) {
    // Check if customer exists
    const existingCustomer = await customerRepository.findById(id);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    // Validate type if provided
    if (updateData.type) {
      this.validateType(updateData.type);
    }

    // Check code uniqueness if changing code
    if (updateData.code && updateData.code !== existingCustomer.code) {
      const codeExists = await customerRepository.codeExists(updateData.code, id);
      if (codeExists) {
        throw new Error('Customer code already exists');
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

    return customerRepository.update(id, updateData);
  }

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customerRepository.softDelete(id);
  }

  /**
   * Permanently delete customer
   */
  async permanentlyDeleteCustomer(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customerRepository.hardDelete(id);
  }

  /**
   * Restore soft-deleted customer
   */
  async restoreCustomer(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (customer.isActive) {
      throw new Error('Customer is already active');
    }

    return customerRepository.restore(id);
  }

  /**
   * Search customers
   */
  async searchCustomers(keyword, options = {}) {
    if (!keyword || keyword.trim().length === 0) {
      throw new Error('Search keyword is required');
    }
    return customerRepository.search(keyword.trim(), options);
  }

  /**
   * Get paginated customers
   */
  async getPaginatedCustomers(page = 1, limit = 10, filters = {}, sort = { createdAt: -1 }) {
    // Validate pagination parameters
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return customerRepository.paginate(page, limit, filters, sort);
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics() {
    return customerRepository.getStatistics();
  }

  /**
   * Validate credit limit for transaction
   */
  async validateCreditLimit(customerId, transactionAmount) {
    const customer = await this.getCustomerById(customerId);
    
    if (!customer.checkCreditAvailability(transactionAmount)) {
      throw new Error(`Transaction amount exceeds customer credit limit of ${customer.financialInfo.creditLimit}`);
    }

    return true;
  }

  /**
   * Get customers with credit limit
   */
  async getCustomersWithCreditLimit(minLimit = 0) {
    return customerRepository.findWithCreditLimit(minLimit);
  }

  /**
   * Validate customer type
   */
  validateType(type) {
    const validTypes = ['customer', 'supplier', 'both'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Bulk create customers
   */
  async bulkCreateCustomers(customersData) {
    if (!Array.isArray(customersData) || customersData.length === 0) {
      throw new Error('Customers data must be a non-empty array');
    }

    // Validate each customer
    const validatedCustomers = [];
    const errors = [];

    for (let i = 0; i < customersData.length; i += 1) {
      const customerData = customersData[i];
      try {
        // Validate required fields
        if (!customerData.name) {
          throw new Error('Customer name is required');
        }

        // Validate type
        if (customerData.type) {
          this.validateType(customerData.type);
        }

        // Check for duplicate code in batch
        if (customerData.code) {
          const duplicateCode = validatedCustomers.find((c) => c.code === customerData.code);
          if (duplicateCode) {
            throw new Error(`Duplicate code in batch: ${customerData.code}`);
          }

          // Check if code exists in database
          const codeExists = await customerRepository.codeExists(customerData.code);
          if (codeExists) {
            throw new Error(`Code already exists: ${customerData.code}`);
          }
        }

        // Validate email format if provided
        if (customerData.contactInfo?.email) {
          const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
          if (!emailRegex.test(customerData.contactInfo.email)) {
            throw new Error('Invalid email format');
          }
        }

        validatedCustomers.push(customerData);
      } catch (error) {
        errors.push({
          index: i,
          name: customerData.name,
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors.map((e) => `Index ${e.index} (${e.name}): ${e.error}`).join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    return customerRepository.bulkCreate(validatedCustomers);
  }

  /**
   * Toggle customer active status
   */
  async toggleCustomerStatus(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customerRepository.update(id, { isActive: !customer.isActive });
  }
}

module.exports = new CustomerService();
