const customerService = require('../../src/services/customerService');
const customerRepository = require('../../src/repositories/customerRepository');

// Mock the repository
jest.mock('../../src/repositories/customerRepository');

describe('Customer Service Unit Tests', () =\u003e {
  afterEach(() =\u003e {
  jest.clearAllMocks();
});

describe('getCustomerById', () =\u003e {
  it('should return customer when found', async () =\u003e {
  const mockCustomer = { _id: '123', name: 'Test Customer', code: 'CUST001' };
  customerRepository.findById.mockResolvedValue(mockCustomer);

  const result = await customerService.getCustomerById('123');

  expect(result).toEqual(mockCustomer);
  expect(customerRepository.findById).toHaveBeenCalledWith('123');
    });

it('should throw error when customer not found', async() =\u003e {
  customerRepository.findById.mockResolvedValue(null);

  await expect(customerService.getCustomerById('123')).rejects.toThrow('Customer not found');
    });
  });

describe('getCustomerByCode', () =\u003e {
  it('should return customer when found by code', async () =\u003e {
  const mockCustomer = { _id: '123', name: 'Test Customer', code: 'CUST001' };
  customerRepository.findByCode.mockResolvedValue(mockCustomer);

  const result = await customerService.getCustomerByCode('CUST001');

  expect(result).toEqual(mockCustomer);
  expect(customerRepository.findByCode).toHaveBeenCalledWith('CUST001');
    });

it('should throw error when customer not found by code', async() =\u003e {
  customerRepository.findByCode.mockResolvedValue(null);

  await expect(customerService.getCustomerByCode('INVALID')).rejects.toThrow('Customer not found');
    });
  });

describe('createCustomer', () =\u003e {
  it('should create customer with valid data', async () =\u003e {
  const customerData = {
    name: 'New Customer',
    code: 'CUST002',
    type: 'customer',
  };
  const mockCreatedCustomer = { _id: '456', ...customerData };

  customerRepository.codeExists.mockResolvedValue(false);
  customerRepository.create.mockResolvedValue(mockCreatedCustomer);

  const result = await customerService.createCustomer(customerData);

  expect(result).toEqual(mockCreatedCustomer);
  expect(customerRepository.codeExists).toHaveBeenCalledWith('CUST002');
expect(customerRepository.create).toHaveBeenCalledWith(customerData);
    });

it('should throw error when name is missing', async() =\u003e {
  const customerData = { code: 'CUST002' };

  await expect(customerService.createCustomer(customerData)).rejects.toThrow('Customer name is required');
    });

it('should throw error when code already exists', async() =\u003e {
  const customerData = {
    name: 'New Customer',
    code: 'CUST002',
  };

  customerRepository.codeExists.mockResolvedValue(true);

  await expect(customerService.createCustomer(customerData)).rejects.toThrow('Customer code already exists');
    });

it('should throw error for invalid type', async() =\u003e {
  const customerData = {
    name: 'New Customer',
    type: 'invalid',
  };

  await expect(customerService.createCustomer(customerData)).rejects.toThrow('Invalid type');
    });

it('should throw error for negative credit limit', async() =\u003e {
  const customerData = {
    name: 'New Customer',
    financialInfo: {
      creditLimit: -1000,
    },
  };

  await expect(customerService.createCustomer(customerData)).rejects.toThrow('Credit limit cannot be negative');
    });

it('should throw error for invalid payment terms', async() =\u003e {
  const customerData = {
    name: 'New Customer',
    financialInfo: {
      paymentTerms: 400,
    },
  };

  await expect(customerService.createCustomer(customerData)).rejects.toThrow('Payment terms must be between 0 and 365 days');
    });

it('should throw error for invalid email format', async() =\u003e {
  const customerData = {
    name: 'New Customer',
    contactInfo: {
      email: 'invalid-email',
    },
  };

  await expect(customerService.createCustomer(customerData)).rejects.toThrow('Invalid email format');
    });
  });

describe('updateCustomer', () =\u003e {
  it('should update customer with valid data', async () =\u003e {
  const existingCustomer = { _id: '123', name: 'Old Name', code: 'CUST001' };
  const updateData = { name: 'New Name' };
  const updatedCustomer = { ...existingCustomer, ...updateData };

  customerRepository.findById.mockResolvedValue(existingCustomer);
  customerRepository.update.mockResolvedValue(updatedCustomer);

  const result = await customerService.updateCustomer('123', updateData);

  expect(result).toEqual(updatedCustomer);
  expect(customerRepository.update).toHaveBeenCalledWith('123', updateData);
    });

it('should throw error when customer not found', async() =\u003e {
  customerRepository.findById.mockResolvedValue(null);

  await expect(customerService.updateCustomer('123', { name: 'New Name' })).rejects.toThrow('Customer not found');
    });

it('should throw error when updating to duplicate code', async() =\u003e {
  const existingCustomer = { _id: '123', name: 'Customer', code: 'CUST001' };
  const updateData = { code: 'CUST002' };

  customerRepository.findById.mockResolvedValue(existingCustomer);
  customerRepository.codeExists.mockResolvedValue(true);

  await expect(customerService.updateCustomer('123', updateData)).rejects.toThrow('Customer code already exists');
    });
  });

describe('deleteCustomer', () =\u003e {
  it('should soft delete customer', async () =\u003e {
  const mockCustomer = { _id: '123', name: 'Customer', isActive: true };
  const deletedCustomer = { ...mockCustomer, isActive: false };

  customerRepository.findById.mockResolvedValue(mockCustomer);
  customerRepository.softDelete.mockResolvedValue(deletedCustomer);

  const result = await customerService.deleteCustomer('123');

  expect(result).toEqual(deletedCustomer);
  expect(customerRepository.softDelete).toHaveBeenCalledWith('123');
    });

it('should throw error when customer not found', async() =\u003e {
  customerRepository.findById.mockResolvedValue(null);

  await expect(customerService.deleteCustomer('123')).rejects.toThrow('Customer not found');
    });
  });

describe('validateCreditLimit', () =\u003e {
  it('should pass validation when within credit limit', async () =\u003e {
  const mockCustomer = {
    _id: '123',
    name: 'Customer',
    financialInfo: { creditLimit: 10000 },
    checkCreditAvailability: jest.fn().mockReturnValue(true),
  };

  customerRepository.findById.mockResolvedValue(mockCustomer);

  const result = await customerService.validateCreditLimit('123', 5000);

  expect(result).toBe(true);
  expect(mockCustomer.checkCreditAvailability).toHaveBeenCalledWith(5000);
    });

it('should throw error when exceeding credit limit', async() =\u003e {
  const mockCustomer = {
    _id: '123',
    name: 'Customer',
    financialInfo: { creditLimit: 10000 },
    checkCreditAvailability: jest.fn().mockReturnValue(false),
  };

  customerRepository.findById.mockResolvedValue(mockCustomer);

  await expect(customerService.validateCreditLimit('123', 15000)).rejects.toThrow('Transaction amount exceeds customer credit limit');
    });
  });

describe('validateType', () =\u003e {
  it('should pass for valid types', () =\u003e {
    expect(() =\u003e customerService.validateType('customer')).not.toThrow();
expect(() =\u003e customerService.validateType('supplier')).not.toThrow();
expect(() =\u003e customerService.validateType('both')).not.toThrow();
    });

it('should throw error for invalid type', () =\u003e {
  expect(() =\u003e customerService.validateType('invalid')).toThrow('Invalid type');
    });
  });

describe('getAllCustomers', () =\u003e {
  it('should return paginated customers', async () =\u003e {
  const mockCustomers = [
    { _id: '1', name: 'Customer 1' },
    { _id: '2', name: 'Customer 2' },
  ];

  customerRepository.search.mockResolvedValue(mockCustomers);
  customerRepository.count.mockResolvedValue(10);

  const result = await customerService.getAllCustomers({}, { page: 1, limit: 2 });

  expect(result.customers).toEqual(mockCustomers);
expect(result.pagination.totalItems).toBe(10);
expect(result.pagination.currentPage).toBe(1);
expect(result.pagination.totalPages).toBe(5);
    });
  });

describe('searchCustomers', () =\u003e {
  it('should search customers with keyword', async () =\u003e {
  const mockCustomers = [{ _id: '1', name: 'Test Customer' }];
  customerRepository.search.mockResolvedValue(mockCustomers);

  const result = await customerService.searchCustomers('Test');

  expect(result).toEqual(mockCustomers);
  expect(customerRepository.search).toHaveBeenCalledWith('Test', {});
    });

it('should throw error for empty keyword', async() =\u003e {
  await expect(customerService.searchCustomers('')).rejects.toThrow('Search keyword is required');
await expect(customerService.searchCustomers('   ')).rejects.toThrow('Search keyword is required');
    });
  });

describe('bulkCreateCustomers', () =\u003e {
  it('should create multiple customers', async () =\u003e {
  const customersData = [
    { name: 'Customer 1', code: 'C001' },
    { name: 'Customer 2', code: 'C002' },
  ];
  const mockCreated = customersData.map((c, i) =\u003e({ _id: `${i}`, ...c }));

  customerRepository.codeExists.mockResolvedValue(false);
  customerRepository.bulkCreate.mockResolvedValue(mockCreated);

  const result = await customerService.bulkCreateCustomers(customersData);

  expect(result).toEqual(mockCreated);
  expect(customerRepository.bulkCreate).toHaveBeenCalledWith(customersData);
    });

it('should throw error for empty array', async() =\u003e {
  await expect(customerService.bulkCreateCustomers([])).rejects.toThrow('Customers data must be a non-empty array');
    });

it('should throw error for duplicate codes in batch', async() =\u003e {
  const customersData = [
    { name: 'Customer 1', code: 'DUP' },
    { name: 'Customer 2', code: 'DUP' },
  ];

  await expect(customerService.bulkCreateCustomers(customersData)).rejects.toThrow('Duplicate code in batch');
    });
  });

describe('getAccountsByRoute - Phase 2 (Requirement 17.2)', () =\u003e {
  const Route = require('../../src/models/Route');

  beforeEach(() =\u003e {
  // Mock the Route model
  jest.mock('../../src/models/Route');
});

it('should return customers for a valid route', async() =\u003e {
  const routeId = 'route123';
  const mockRoute = { _id: routeId, name: 'Test Route', code: 'RT001' };
  const mockCustomers = [
    { _id: '1', name: 'Customer 1', routeId: routeId, isActive: true },
    { _id: '2', name: 'Customer 2', routeId: routeId, isActive: true },
  ];

  // Mock Route.findById to return a valid route
  Route.findById = jest.fn().mockResolvedValue(mockRoute);
  customerRepository.findAll.mockResolvedValue(mockCustomers);

  const result = await customerService.getAccountsByRoute(routeId);

  expect(Route.findById).toHaveBeenCalledWith(routeId);
expect(customerRepository.findAll).toHaveBeenCalledWith(
  { routeId: routeId, isActive: true },
  { sort: { name: 1 } }
);
expect(result).toEqual(mockCustomers);
    });

it('should throw error when route ID is not provided', async() =\u003e {
  await expect(customerService.getAccountsByRoute(null)).rejects.toThrow('Route ID is required');
await expect(customerService.getAccountsByRoute('')).rejects.toThrow('Route ID is required');
await expect(customerService.getAccountsByRoute(undefined)).rejects.toThrow('Route ID is required');
    });

it('should throw error when route does not exist', async() =\u003e {
  const routeId = 'nonexistent';
  Route.findById = jest.fn().mockResolvedValue(null);

  await expect(customerService.getAccountsByRoute(routeId)).rejects.toThrow('Route not found');
expect(Route.findById).toHaveBeenCalledWith(routeId);
    });

it('should return empty array when no customers on route', async() =\u003e {
  const routeId = 'route123';
  const mockRoute = { _id: routeId, name: 'Test Route', code: 'RT001' };

  Route.findById = jest.fn().mockResolvedValue(mockRoute);
  customerRepository.findAll.mockResolvedValue([]);

  const result = await customerService.getAccountsByRoute(routeId);

  expect(result).toEqual([]);
});

it('should only return active customers', async() =\u003e {
  const routeId = 'route123';
  const mockRoute = { _id: routeId, name: 'Test Route', code: 'RT001' };
  const mockCustomers = [
    { _id: '1', name: 'Active Customer', routeId: routeId, isActive: true },
  ];

  Route.findById = jest.fn().mockResolvedValue(mockRoute);
  customerRepository.findAll.mockResolvedValue(mockCustomers);

  const result = await customerService.getAccountsByRoute(routeId);

  expect(customerRepository.findAll).toHaveBeenCalledWith(
    { routeId: routeId, isActive: true },
    { sort: { name: 1 } }
  );
expect(result).toEqual(mockCustomers);
    });

it('should return customers sorted by name', async() =\u003e {
  const routeId = 'route123';
  const mockRoute = { _id: routeId, name: 'Test Route', code: 'RT001' };
  const mockCustomers = [
    { _id: '1', name: 'A Customer', routeId: routeId, isActive: true },
    { _id: '2', name: 'B Customer', routeId: routeId, isActive: true },
    { _id: '3', name: 'C Customer', routeId: routeId, isActive: true },
  ];

  Route.findById = jest.fn().mockResolvedValue(mockRoute);
  customerRepository.findAll.mockResolvedValue(mockCustomers);

  const result = await customerService.getAccountsByRoute(routeId);

  expect(customerRepository.findAll).toHaveBeenCalledWith(
    expect.any(Object),
    { sort: { name: 1 } }
  );
expect(result).toEqual(mockCustomers);
    });
  });
});
