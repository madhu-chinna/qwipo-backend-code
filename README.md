# Customer Management System - Backend API

A robust, production-ready Node.js backend API for managing customers and their addresses with comprehensive validation, error handling, and logging.

## 🚀 Features

- **RESTful API Design** with proper HTTP status codes
- **SQLite Database** with automatic table creation
- **Input Validation** using express-validator
- **Comprehensive Error Handling** with custom error middleware
- **Structured Logging** using Winston logger
- **CORS Support** for cross-origin requests
- **Transaction Support** for data integrity
- **Search & Filtering** capabilities
- **Pagination** for large datasets
- **Graceful Shutdown** handling

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3 (cross-platform compatible)
- **Validation**: express-validator
- **Logging**: Winston
- **CORS**: cors middleware
- **Development**: Nodemon (auto-restart)

## 📁 Project Structure

```
server/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── customer.db           # SQLite database file
├── nodemon.json         # Nodemon configuration
├── tsconfig.json        # TypeScript configuration
├── src/                 # Source code directory
│   ├── controllers/     # Business logic controllers
│   ├── models/         # Data models
│   ├── routes/         # API route definitions
│   └── db/            # Database configuration
└── tests/              # Test files
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Server will start on port 3009**:
   ```
   🚀 Server running on port 3009
   Connected to SQLite database
   ```

## 🗄️ Database Schema

### Customers Table
```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    phoneNumber TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Addresses Table
```sql
CREATE TABLE addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    addressLine TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pinCode TEXT NOT NULL,
    isPrimary BOOLEAN DEFAULT false,
    FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);
```

## 📡 API Endpoints

### Customer Management

#### 1. Create Customer with Addresses
```http
POST /api/customers
Content-Type: application/json

{
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "1234567890"
  },
  "addresses": [
    {
      "addressLine": "123 Main St",
      "city": "New York",
      "state": "NY",
      "pinCode": "10001",
      "isPrimary": true
    }
  ]
}
```

**Response**: `201 Created`
```json
{
  "message": "Customer created successfully",
  "customerId": 1
}
```

#### 2. Get Customer by ID
```http
GET /api/customers/:id
```

**Response**: `200 OK`
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "1234567890",
  "createdAt": "2025-09-01T17:25:01.990Z",
  "addresses": [...]
}
```

#### 3. Get All Customers (with Pagination & Filtering)
```http
GET /api/customers?page=1&limit=10&sortBy=createdAt&order=DESC&city=New York&state=NY&pinCode=10001
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 5)
- `sortBy`: Sort field (default: createdAt)
- `order`: Sort order ASC/DESC (default: DESC)
- `city`: Filter by city
- `state`: Filter by state
- `pinCode`: Filter by PIN code

#### 4. Update Customer
```http
PUT /api/customers/:id
Content-Type: application/json

{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "phoneNumber": "1234567890"
}
```

#### 5. Check Single Address Customer
```http
GET /api/customers/:id/isSingleAddress
```

### Address Management

#### 1. Get Customer Addresses
```http
GET /api/customers/:id/addresses
```

#### 2. Add New Address
```http
POST /api/customers/:id/addresses
Content-Type: application/json

{
  "addressLine": "456 Oak Ave",
  "city": "Los Angeles",
  "state": "CA",
  "pinCode": "90210",
  "isPrimary": false
}
```

#### 3. Update Address
```http
PUT /api/addresses/:id
Content-Type: application/json

{
  "addressLine": "456 Oak Avenue Updated",
  "city": "Los Angeles",
  "state": "CA",
  "pinCode": "90210",
  "isPrimary": true
}
```

#### 4. Delete Address
```http
DELETE /api/addresses/:id
```

**Response**: `200 OK`
```json
{
  "message": "Address deleted successfully"
}
```

**Note**: Cannot delete the last address of a customer. Customer must have at least one address.

#### 5. Delete Customer
```http
DELETE /api/customers/:id
```

**Response**: `200 OK`
```json
{
  "message": "Customer and all addresses deleted successfully"
}
```

**Note**: This will delete the customer and all associated addresses due to CASCADE constraint.

## ✅ Validation Rules

### Customer Validation
- `firstName`: Required, non-empty string
- `lastName`: Required, non-empty string
- `phoneNumber`: Required, 10-digit number, must be unique

### Address Validation
- `addressLine`: Required, non-empty string
- `city`: Required, non-empty string
- `state`: Required, non-empty string
- `pinCode`: Required, 6-digit number

## 🔒 Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error

### Error Response Format
```json
{
  "error": "Error message description"
}
```

### Validation Error Format
```json
{
  "errors": [
    {
      "msg": "First name is required",
      "param": "customer.firstName",
      "location": "body"
    }
  ]
}
```

## 📊 Logging

The application uses Winston logger with:
- **Log Level**: INFO
- **Format**: Timestamp + Level + Message
- **Output**: Console
- **Example**: `2025-09-01T17:25:01.990Z [INFO]: 🚀 Server running on port 3009`

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
- Unit tests for API endpoints
- Integration tests for database operations
- Validation tests for input data

## ⚙️ Configuration

### Environment Variables
- `PORT`: Server port (default: 3009)
- `NODE_ENV`: Environment (development/production)

### Database Configuration
- **Type**: SQLite3
- **File**: `customer.db` (auto-created)
- **Location**: Server root directory

## 🚀 Deployment

### Render Platform Deployment

This backend is optimized for deployment on Render.com. Follow these steps:

#### 1. **Connect Your Repository**
- Push your code to GitHub
- Connect your GitHub repository to Render
- Render will automatically detect the Node.js environment

#### 2. **Automatic Deployment**
- Render will use the `render.yaml` configuration
- Build command: `npm install`
- Start command: `npm start`
- Health check endpoint: `/health`

#### 3. **Environment Variables**
- `NODE_ENV`: production
- `PORT`: 10000 (Render's default)

#### 4. **Database Persistence**
- SQLite database file is created automatically
- Data persists between deployments
- No external database setup required

### Production Build
```bash
npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up reverse proxy (nginx/apache)
4. Configure SSL certificates

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3009
CMD ["npm", "start"]
```

## 🔧 Development

### Auto-restart
Nodemon automatically restarts the server when files change:
```bash
npm run dev
```

### Database Reset
Delete `customer.db` file to reset the database:
```bash
rm customer.db
```

### Logs
Monitor server logs in real-time:
```bash
# In another terminal
tail -f logs/app.log
```

## 📈 Performance

### Optimizations
- **Database Indexing**: Primary keys and foreign keys
- **Connection Pooling**: SQLite connection management
- **Query Optimization**: Efficient JOIN queries
- **Response Caching**: HTTP caching headers

### Monitoring
- Response time logging
- Database query performance
- Memory usage tracking
- Error rate monitoring

## 🔐 Security

### Implemented Security Features
- **Input Validation**: Prevents injection attacks
- **CORS Configuration**: Controlled cross-origin access
- **SQL Injection Protection**: Parameterized queries
- **Error Sanitization**: No sensitive data in error messages

### Security Best Practices
- Regular dependency updates
- Input sanitization
- Rate limiting (can be added)
- Authentication middleware (can be added)

## 🚧 Future Enhancements

### Planned Features
- [ ] User authentication & authorization
- [ ] Rate limiting
- [ ] API documentation (Swagger)
- [ ] Database migrations
- [ ] Backup & recovery
- [ ] Monitoring dashboard
- [ ] Email notifications
- [ ] File uploads

### Technical Debt
- [ ] Add TypeScript support
- [ ] Implement proper testing framework
- [ ] Add database connection pooling
- [ ] Implement caching layer
- [ ] Add health check endpoints

## 📞 Support

### Troubleshooting
1. **Port already in use**: Change PORT in environment
2. **Database errors**: Check file permissions for `customer.db`
3. **Validation errors**: Verify request body format
4. **CORS issues**: Check frontend origin configuration

### Common Issues
- **Phone number duplicate**: Ensure unique phone numbers
- **Address deletion**: Check if it's the only address
- **Database locked**: Restart server if database is busy

### Render Deployment Issues
- **Build failures**: Check Node.js version compatibility
- **Database errors**: Ensure sqlite3 is properly installed
- **Port conflicts**: Render automatically assigns ports
- **Native dependencies**: sqlite3 will auto-compile on Render's Linux servers

## 📄 License

This project is licensed under the ISC License.

---

**Last Updated**: September 1, 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team
