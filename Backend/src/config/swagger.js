/**
 * Swagger/OpenAPI Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Indus Traders Backend API',
      version: '1.0.0',
      description: 'Comprehensive ERP system for managing sales, purchases, inventory, accounts, and reporting',
      contact: {
        name: 'Indus Traders',
        email: 'support@industraders.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.industraders.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                      },
                      message: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          required: ['username', 'email', 'password', 'role'],
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              example: 'john_doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              enum: ['admin', 'sales', 'purchase', 'inventory', 'accountant', 'data_entry'],
              example: 'admin',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Customer: {
          type: 'object',
          required: ['code', 'name', 'type'],
          properties: {
            _id: {
              type: 'string',
            },
            code: {
              type: 'string',
              example: 'CUST000001',
            },
            name: {
              type: 'string',
              example: 'ABC Corporation',
            },
            type: {
              type: 'string',
              enum: ['customer', 'supplier', 'both'],
              example: 'customer',
            },
            contactInfo: {
              type: 'object',
              properties: {
                phone: {
                  type: 'string',
                  example: '+92-300-1234567',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
                address: {
                  type: 'string',
                },
                city: {
                  type: 'string',
                  example: 'Karachi',
                },
                country: {
                  type: 'string',
                  example: 'Pakistan',
                },
              },
            },
            financialInfo: {
              type: 'object',
              properties: {
                creditLimit: {
                  type: 'number',
                  example: 100000,
                },
                paymentTerms: {
                  type: 'number',
                  example: 30,
                },
                taxNumber: {
                  type: 'string',
                },
                currency: {
                  type: 'string',
                  example: 'PKR',
                },
              },
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
          },
        },
        Item: {
          type: 'object',
          required: ['code', 'name', 'category', 'unit'],
          properties: {
            _id: {
              type: 'string',
            },
            code: {
              type: 'string',
              example: 'ITEM000001',
            },
            name: {
              type: 'string',
              example: 'Product Name',
            },
            description: {
              type: 'string',
            },
            category: {
              type: 'string',
              example: 'Electronics',
            },
            unit: {
              type: 'string',
              enum: ['piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'cm', 'box', 'pack', 'dozen'],
              example: 'piece',
            },
            pricing: {
              type: 'object',
              properties: {
                costPrice: {
                  type: 'number',
                  example: 100,
                },
                salePrice: {
                  type: 'number',
                  example: 150,
                },
                currency: {
                  type: 'string',
                  example: 'PKR',
                },
              },
            },
            tax: {
              type: 'object',
              properties: {
                gstRate: {
                  type: 'number',
                  example: 17,
                },
                whtRate: {
                  type: 'number',
                  example: 4,
                },
                taxCategory: {
                  type: 'string',
                  example: 'standard',
                },
              },
            },
            inventory: {
              type: 'object',
              properties: {
                currentStock: {
                  type: 'number',
                  example: 100,
                },
                minimumStock: {
                  type: 'number',
                  example: 10,
                },
                maximumStock: {
                  type: 'number',
                  example: 1000,
                },
              },
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
          },
        },
        Invoice: {
          type: 'object',
          required: ['type', 'invoiceDate', 'dueDate', 'items'],
          properties: {
            _id: {
              type: 'string',
            },
            invoiceNumber: {
              type: 'string',
              example: 'SI2024000001',
            },
            type: {
              type: 'string',
              enum: ['sales', 'purchase'],
              example: 'sales',
            },
            customerId: {
              type: 'string',
            },
            supplierId: {
              type: 'string',
            },
            invoiceDate: {
              type: 'string',
              format: 'date-time',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  itemId: {
                    type: 'string',
                  },
                  quantity: {
                    type: 'number',
                    example: 10,
                  },
                  unitPrice: {
                    type: 'number',
                    example: 150,
                  },
                  discount: {
                    type: 'number',
                    example: 5,
                  },
                  taxAmount: {
                    type: 'number',
                    example: 25.5,
                  },
                  lineTotal: {
                    type: 'number',
                    example: 1450.5,
                  },
                },
              },
            },
            totals: {
              type: 'object',
              properties: {
                subtotal: {
                  type: 'number',
                  example: 1500,
                },
                totalDiscount: {
                  type: 'number',
                  example: 75,
                },
                totalTax: {
                  type: 'number',
                  example: 255,
                },
                grandTotal: {
                  type: 'number',
                  example: 1680,
                },
              },
            },
            status: {
              type: 'string',
              enum: ['draft', 'confirmed', 'paid', 'cancelled'],
              example: 'confirmed',
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'partial', 'paid'],
              example: 'pending',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              example: 1,
            },
            limit: {
              type: 'number',
              example: 20,
            },
            total: {
              type: 'number',
              example: 100,
            },
            pages: {
              type: 'number',
              example: 5,
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number',
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          description: 'Number of items per page',
        },
        SortParam: {
          in: 'query',
          name: 'sort',
          schema: {
            type: 'string',
          },
          description: 'Sort field and order (e.g., -createdAt for descending)',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management',
      },
      {
        name: 'Customers',
        description: 'Customer management',
      },
      {
        name: 'Suppliers',
        description: 'Supplier management',
      },
      {
        name: 'Items',
        description: 'Item and inventory management',
      },
      {
        name: 'Invoices',
        description: 'Sales and purchase invoice management',
      },
      {
        name: 'Accounts',
        description: 'Accounts and ledger management',
      },
      {
        name: 'Cash Book',
        description: 'Cash receipts and payments',
      },
      {
        name: 'Reports',
        description: 'Reporting and analytics',
      },
      {
        name: 'Monitoring',
        description: 'System monitoring and health checks',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
