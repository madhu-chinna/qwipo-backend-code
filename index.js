// server.js
const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
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
app.use(cors());
app.use(express.json());

// ---------- Database Setup ----------
let db;
try {
  const dbPath = path.join(__dirname, 'customer.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      logger.error(`Database connection error: ${err.message}`);
      process.exit(1);
    }
    logger.info('Connected to SQLite database');

    // Create tables if they don't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        phoneNumber TEXT NOT NULL UNIQUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER,
        addressLine TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pinCode TEXT NOT NULL,
        isPrimary BOOLEAN DEFAULT false,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);
  });
} catch (err) {
  logger.error(`Database initialization error: ${err.message}`);
  process.exit(1);
}

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

// Create a new customer with addresses
app.post('/api/customers', customerValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { customer, addresses } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      'INSERT INTO customers (firstName, lastName, phoneNumber) VALUES (?, ?, ?)',
      [customer.firstName, customer.lastName, customer.phoneNumber],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Phone number already exists' });
          }
          logger.error(`Error creating customer: ${err}`);
          db.run('ROLLBACK');
          return next(err);
        }

        const customerId = this.lastID;
        let addressesProcessed = 0;

        addresses.forEach((address) => {
          db.run(
            'INSERT INTO addresses (customerId, addressLine, city, state, pinCode, isPrimary) VALUES (?, ?, ?, ?, ?, ?)',
            [customerId, address.addressLine, address.city, address.state, address.pinCode, address.isPrimary || false],
            (err) => {
              if (err) {
                logger.error(`Error creating address: ${err}`);
                db.run('ROLLBACK');
                return next(err);
              }

              addressesProcessed++;
              if (addressesProcessed === addresses.length) {
                db.run('COMMIT');
                res.status(201).json({ message: 'Customer created successfully', customerId });
              }
            }
          );
        });
      }
    );
  });
});

// Get customer by ID + addresses
app.get('/api/customers/:id', (req, res, next) => {
  const customerId = req.params.id;

  db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, customer) => {
    if (err) return next(err);

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    db.all('SELECT * FROM addresses WHERE customerId = ?', [customerId], (err, addresses) => {
      if (err) return next(err);
      res.json({ ...customer, addresses });
    });
  });
});

// Pagination + Sorting + Filtering
app.get('/api/customers', (req, res, next) => {
  let { page = 1, limit = 5, sortBy = 'createdAt', order = 'DESC', city, state, pinCode } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT DISTINCT c.* 
    FROM customers c 
    LEFT JOIN addresses a ON c.id = a.customerId 
    WHERE 1=1
  `;
  const params = [];

  if (city) {
    query += ' AND a.city LIKE ?';
    params.push(`%${city}%`);
  }
  if (state) {
    query += ' AND a.state LIKE ?';
    params.push(`%${state}%`);
  }
  if (pinCode) {
    query += ' AND a.pinCode LIKE ?';
    params.push(`%${pinCode}%`);
  }

  query += ` ORDER BY c.${sortBy} ${order} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, customers) => {
    if (err) return next(err);
    res.json(customers);
  });
});

// Check if customer has only one address
app.get('/api/customers/:id/isSingleAddress', (req, res, next) => {
  const customerId = req.params.id;

  db.get('SELECT COUNT(*) as count FROM addresses WHERE customerId = ?', [customerId], (err, row) => {
    if (err) return next(err);
    res.json({ hasOnlyOneAddress: row.count === 1 });
  });
});

// Update customer
app.put('/api/customers/:id', (req, res, next) => {
  const { firstName, lastName, phoneNumber } = req.body;
  db.run(
    'UPDATE customers SET firstName = ?, lastName = ?, phoneNumber = ? WHERE id = ?',
    [firstName, lastName, phoneNumber, req.params.id],
    (err) => {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Phone number must be unique' });
        }
        return next(err);
      }
      res.json({ message: 'Customer updated successfully' });
    }
  );
});

// Get customer addresses
app.get('/api/customers/:id/addresses', (req, res, next) => {
  const customerId = req.params.id;
  db.all('SELECT * FROM addresses WHERE customerId = ?', [customerId], (err, addresses) => {
    if (err) return next(err);
    res.json(addresses);
  });
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

  const customerId = req.params.id;
  const { addressLine, city, state, pinCode, isPrimary } = req.body;

  db.run(
    'INSERT INTO addresses (customerId, addressLine, city, state, pinCode, isPrimary) VALUES (?, ?, ?, ?, ?, ?)',
    [customerId, addressLine, city, state, pinCode, isPrimary || false],
    function(err) {
      if (err) return next(err);
      res.status(201).json({ 
        message: 'Address added successfully',
        addressId: this.lastID
      });
    }
  );
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

  const addressId = req.params.id;
  const { addressLine, city, state, pinCode, isPrimary } = req.body;

  db.run(
    'UPDATE addresses SET addressLine = ?, city = ?, state = ?, pinCode = ?, isPrimary = ? WHERE id = ?',
    [addressLine, city, state, pinCode, isPrimary || false, addressId],
    (err) => {
      if (err) return next(err);
      res.json({ message: 'Address updated successfully' });
    }
  );
});

// Delete address
app.delete('/api/addresses/:id', (req, res, next) => {
  const addressId = req.params.id;
  
  // First check if this is the only address for the customer
  db.get('SELECT customerId FROM addresses WHERE id = ?', [addressId], (err, address) => {
    if (err) return next(err);
    
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // Check if this is the only address for the customer
    db.get('SELECT COUNT(*) as count FROM addresses WHERE customerId = ?', [address.customerId], (err, countResult) => {
      if (err) return next(err);
      
      if (countResult.count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last address. Customer must have at least one address.' });
      }
      
      // Delete the address
      db.run('DELETE FROM addresses WHERE id = ?', [addressId], (err) => {
        if (err) return next(err);
        res.json({ message: 'Address deleted successfully' });
      });
    });
  });
});

// Delete customer and all their addresses
app.delete('/api/customers/:id', (req, res, next) => {
  const customerId = req.params.id;
  
  // First check if customer exists
  db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, customer) => {
    if (err) return next(err);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Delete customer (addresses will be automatically deleted due to CASCADE)
    db.run('DELETE FROM customers WHERE id = ?', [customerId], (err) => {
      if (err) return next(err);
      res.json({ message: 'Customer and all addresses deleted successfully' });
    });
  });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Connected',
    uptime: process.uptime()
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong, please try again later.' });
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  if (db) {
    db.close((err) => {
      if (err) logger.error(`Error closing DB: ${err}`);
      else logger.info('Database connection closed');
      process.exit(0);
    });
  }
});

process.on('SIGTERM', () => {
  if (db) {
    db.close((err) => {
      if (err) logger.error(`Error closing DB: ${err}`);
      else logger.info('Database connection closed');
      process.exit(0);
    });
  }
});