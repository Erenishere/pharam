# Indus Traders Backend API

Enterprise-grade ERP backend system for trading operations with inventory management, invoicing, and accounting features.

## 🚀 Features

- **User Management** - Role-based access control (Admin, Sales, Purchase, Inventory, Accountant, Data Entry)
- **Customer & Supplier Management** - Complete CRM functionality
- **Inventory Management** - Items, stock tracking, batch management with expiry dates
- **Sales Invoices** - Complete sales workflow with inventory integration
- **Purchase Invoices** - Complete purchase workflow with inventory integration
- **Stock Movements** - Automatic tracking of all inventory changes
- **Batch Tracking** - Manufacturing and expiry date tracking
- **Payment Management** - Full and partial payment tracking
- **Audit Trail** - Complete history of all operations

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**
   
   Open `.env` and update the following:
   
   ```env
   # Database - Replace with your MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/indus_traders
   
   # JWT Secrets - Generate strong secrets (see below)
   JWT_SECRET=your_strong_secret_here
   JWT_REFRESH_SECRET=your_strong_refresh_secret_here
   ```

   **Generate strong JWT secrets:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## 📚 API Documentation

- **Complete API Documentation:** See [API-ENDPOINTS.md](./API-ENDPOINTS.md)
- **Quick Reference:** See [API-QUICK-REFERENCE.md](./API-QUICK-REFERENCE.md)

**Base URL:** `http://localhost:3000/api/v1`

### Quick Start

1. **Login to get token:**
   ```bash
   POST /api/v1/auth/login
   {
     "identifier": "admin@industraders.com",
     "password": "admin123"
   }
   ```

2. **Use token in requests:**
   ```bash
   Authorization: Bearer <your_token>
   ```

## 🗂️ Project Structure

```
Backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── models/           # Database models
│   ├── repositories/     # Data access layer
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── utils/            # Utility functions
│   └── app.js           # Express app setup
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── setup.js         # Test configuration
├── .env.example         # Environment template
├── package.json
└── README.md
```

## 🔐 Security

- **Never commit `.env` file** - It contains sensitive credentials
- **Use strong JWT secrets** - Generate cryptographically secure secrets
- **Change default passwords** - Update all default credentials in production
- **Enable HTTPS** - Always use HTTPS in production
- **Rate limiting** - Configured to prevent abuse
- **Input validation** - All inputs are validated and sanitized

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit Tests** - Test individual functions and services
- **Integration Tests** - Test complete workflows
- **25+ Purchase Invoice Tests** - Complete workflow testing

Run tests:
```bash
npm test
```

## 📊 Database

The application uses MongoDB with the following collections:

- `users` - System users
- `customers` - Customer/Supplier records
- `suppliers` - Supplier records (uses same model as customers)
- `items` - Inventory items
- `invoices` - Sales and purchase invoices
- `stockmovements` - Inventory movement history
- `batches` - Batch tracking with expiry dates

## 🔄 Workflows

### Purchase Invoice Workflow
```
Draft → Confirm (✅ Inventory Increased) → Paid
  ↓         ↓
Cancel   Cancel (✅ Inventory Reversed)
```

### Sales Invoice Workflow
```
Draft → Confirm (✅ Inventory Decreased) → Paid
  ↓         ↓
Cancel   Cancel (✅ Inventory Reversed)
```

## 👥 User Roles

- **Admin** - Full system access
- **Sales** - Sales operations and customer management
- **Purchase** - Purchase operations and supplier management
- **Inventory** - Inventory and stock management
- **Accountant** - Financial operations and reporting
- **Data Entry** - Basic data entry operations

## 🛠️ Available Scripts

```bash
npm start              # Start production server
npm run dev           # Start development server with nodemon
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint errors
npm run format        # Format code with Prettier
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | Yes |
| `CORS_ORIGIN` | Allowed CORS origin | Yes |

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MongoDB URI is correct
- Check network connectivity
- Ensure IP is whitelisted in MongoDB Atlas

### Authentication Issues
- Verify JWT_SECRET is set correctly
- Check token expiration
- Ensure user credentials are correct

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

## 📄 License

ISC

## 👨‍💻 Author

Indus Traders Development Team

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, email support@industraders.com or create an issue in the repository.

---

**Last Updated:** November 15, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
