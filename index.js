// server.js
const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const moment = require('moment-timezone');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3009;

// ---------- Logger Setup ----------
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

// ---------- Middleware ----------
app.use(cors({
  origin: true, // Allow all origins for testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ---------- In-Memory Data Storage ----------
let customers = [];
let addresses = [];
let nextCustomerId = 1;
let nextAddressId = 1;

// ---------- Validation Middleware ----------
const customerValidation = [
  body('customer.firstName').trim().notEmpty().withMessage('First name is required'),
  body('customer.lastName').trim().notEmpty().withMessage('Last name is required'),
  body('customer.phoneNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Valid 10-digit phone number is required'),
  body('addresses.*.addressLine').trim().notEmpty(),
  body('addresses.*.city').trim().notEmpty(),
  body('addresses.*.state').trim().notEmpty(),
  body('addresses.*.pinCode').trim().matches(/^[0-9]{6}$/).withMessage('Valid 6-digit PIN is required')
];

// ---------- Routes ----------

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Customer Management System Backend is running!' });
});

// Create a new customer with addresses
app.post('/api/customers', customerValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { customer, addresses } = req.body;

  try {
    // Check if phone number already exists
    const existingCustomer = customers.find(c => c.phoneNumber === customer.phoneNumber);
    if (existingCustomer) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    // Create new customer
    const newCustomer = {
      id: nextCustomerId++,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phoneNumber,
      createdAt: moment.tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    };

    customers.push(newCustomer);

    // Create addresses for the customer
    const customerAddresses = addresses.map((address, index) => ({
      id: nextAddressId++,
      customerId: newCustomer.id,
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      pinCode: address.pinCode,
      isPrimary: address.isPrimary || (index === 0) // First address is primary by default
    }));

    addresses.push(...customerAddresses);

    res.status(201).json({ 
      message: 'Customer created successfully', 
      customerId: newCustomer.id 
    });
  } catch (err) {
    logger.error(`Error creating customer: ${err}`);
    return next(err);
  }
});

// Get customer by ID + addresses
app.get('/api/customers/:id', (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerAddresses = addresses.filter(a => a.customerId === customerId);
    res.json({ ...customer, addresses: customerAddresses });
  } catch (err) {
    return next(err);
  }
});

// Pagination + Sorting + Filtering
app.get('/api/customers', (req, res, next) => {
  try {
    let { page = 1, limit = 5, sortBy = 'createdAt', order = 'DESC', city, state, pinCode } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Filter customers based on address criteria
    let filteredCustomers = customers;
    
    if (city || state || pinCode) {
      filteredCustomers = customers.filter(customer => {
        const customerAddresses = addresses.filter(a => a.customerId === customer.id);
        return customerAddresses.some(address => {
          let matches = true;
          if (city && !address.city.toLowerCase().includes(city.toLowerCase())) matches = false;
          if (state && !address.state.toLowerCase().includes(state.toLowerCase())) matches = false;
          if (pinCode && !address.pinCode.includes(pinCode)) matches = false;
          return matches;
        });
      });
    }

    // Sort customers
    filteredCustomers.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt') {
        aValue = moment(aValue, 'YYYY-MM-DD HH:mm:ss');
        bValue = moment(bValue, 'YYYY-MM-DD HH:mm:ss');
      }
      
      if (order === 'ASC') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const paginatedCustomers = filteredCustomers.slice(offset, offset + limit);
    
    res.json({
      customers: paginatedCustomers,
      pagination: {
        page,
        limit,
        total: filteredCustomers.length,
        totalPages: Math.ceil(filteredCustomers.length / limit)
      }
    });
  } catch (err) {
    return next(err);
  }
});

// Check if customer has only one address
app.get('/api/customers/:id/isSingleAddress', (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);
    const customerAddresses = addresses.filter(a => a.customerId === customerId);
    res.json({ hasOnlyOneAddress: customerAddresses.length === 1 });
  } catch (err) {
    return next(err);
  }
});

// Update customer
app.put('/api/customers/:id', (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);
    const { firstName, lastName, phoneNumber } = req.body;
    
    const customerIndex = customers.findIndex(c => c.id === customerId);
    if (customerIndex === -1) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if phone number already exists (excluding current customer)
    const existingCustomer = customers.find(c => c.phoneNumber === phoneNumber && c.id !== customerId);
    if (existingCustomer) {
      return res.status(400).json({ error: 'Phone number must be unique' });
    }

    // Update customer
    customers[customerIndex] = {
      ...customers[customerIndex],
      firstName,
      lastName,
      phoneNumber
    };

    res.json({ message: 'Customer updated successfully' });
  } catch (err) {
    return next(err);
  }
});

// Get customer addresses
app.get('/api/customers/:id/addresses', (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);
    const customerAddresses = addresses.filter(a => a.customerId === customerId);
    res.json(customerAddresses);
  } catch (err) {
    return next(err);
  }
});

// Add new address
app.post('/api/customers/:id/addresses', [
  body('addressLine').trim().notEmpty().withMessage('Address line is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pinCode').trim().matches(/^[0-9]{6}$/).withMessage('Valid 6-digit PIN is required')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const customerId = parseInt(req.params.id);
    const { addressLine, city, state, pinCode, isPrimary } = req.body;

    // Check if customer exists
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // If this is the first address, make it primary
    const customerAddresses = addresses.filter(a => a.customerId === customerId);
    const shouldBePrimary = isPrimary || customerAddresses.length === 0;

    // If making this address primary, unset other primary addresses
    if (shouldBePrimary) {
      addresses.forEach(addr => {
        if (addr.customerId === customerId) {
          addr.isPrimary = false;
        }
      });
    }

    const newAddress = {
      id: nextAddressId++,
      customerId,
      addressLine,
      city,
      state,
      pinCode,
      isPrimary: shouldBePrimary
    };

    addresses.push(newAddress);
    
    res.status(201).json({ 
      message: 'Address added successfully',
      addressId: newAddress.id
    });
  } catch (err) {
    return next(err);
  }
});

// Update address
app.put('/api/addresses/:id', [
  body('addressLine').trim().notEmpty().withMessage('Address line is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pinCode').trim().matches(/^[0-9]{6}$/).withMessage('Valid 6-digit PIN is required')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const addressId = parseInt(req.params.id);
    const { addressLine, city, state, pinCode, isPrimary } = req.body;

    const addressIndex = addresses.findIndex(a => a.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If making this address primary, unset other primary addresses for the same customer
    if (isPrimary) {
      addresses.forEach(addr => {
        if (addr.customerId === addresses[addressIndex].customerId) {
          addr.isPrimary = false;
        }
      });
    }

    // Update address
    addresses[addressIndex] = {
      ...addresses[addressIndex],
      addressLine,
      city,
      state,
      pinCode,
      isPrimary: isPrimary || false
    };

    res.json({ message: 'Address updated successfully' });
  } catch (err) {
    return next(err);
  }
});

// Delete address
app.delete('/api/addresses/:id', (req, res, next) => {
  try {
    const addressId = parseInt(req.params.id);
    
    const addressIndex = addresses.findIndex(a => a.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const address = addresses[addressIndex];
    const customerAddresses = addresses.filter(a => a.customerId === address.customerId);
    
    if (customerAddresses.length <= 1) {
      return res.status(400).json({ 
        error: 'Cannot delete the last address. Customer must have at least one address.' 
      });
    }

    // Remove the address
    addresses.splice(addressIndex, 1);
    
    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    return next(err);
  }
});

// Delete customer and all their addresses
app.delete('/api/customers/:id', (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);
    
    const customerIndex = customers.findIndex(c => c.id === customerId);
    if (customerIndex === -1) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Remove customer
    customers.splice(customerIndex, 1);
    
    // Remove all addresses for this customer
    const addressIndices = [];
    addresses.forEach((addr, index) => {
      if (addr.customerId === customerId) {
        addressIndices.push(index);
      }
    });
    
    // Remove addresses in reverse order to maintain indices
    addressIndices.reverse().forEach(index => {
      addresses.splice(index, 1);
    });

    res.json({ message: 'Customer and all addresses deleted successfully' });
  } catch (err) {
    return next(err);
  }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'In-Memory Storage',
    uptime: process.uptime(),
    customersCount: customers.length,
    addressesCount: addresses.length
  });
});

// Cleanup all data (for development/production deployment)
app.delete('/api/cleanup/all', (req, res) => {
  try {
    customers = [];
    addresses = [];
    nextCustomerId = 1;
    nextAddressId = 1;
    res.json({ message: 'All data cleaned up successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup data' });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong, please try again later.' });
});

// ---------- Initialize Server ----------
const initializeServer = async () => {
  try {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 In-Memory Storage initialized`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (e) {
    logger.error(`Server Error: ${e.message}`);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
initializeServer();