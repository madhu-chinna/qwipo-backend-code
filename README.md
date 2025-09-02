# Customer Management System Backend

A robust Node.js backend API for managing customer information and addresses with SQLite database.

## Features

- **RESTful API** for customer and address management
- **SQLite Database** with better-sqlite3 for cross-platform compatibility
- **Input Validation** using express-validator
- **CORS Support** for cross-origin requests
- **Logging** with Winston
- **Error Handling** with proper HTTP status codes
- **Transaction Support** for data integrity
- **Health Check** endpoint for monitoring

## API Endpoints

### Customers
- `POST /api/customers` - Create a new customer with addresses
- `GET /api/customers/:id` - Get customer by ID with addresses
- `GET /api/customers` - Get customers with pagination, sorting, and filtering
- `PUT /api/customers/:id` - Update customer information
- `DELETE /api/customers/:id` - Delete customer and all addresses

### Addresses
- `GET /api/customers/:id/addresses` - Get all addresses for a customer
- `POST /api/customers/:id/addresses` - Add a new address
- `PUT /api/addresses/:id` - Update an address
- `DELETE /api/addresses/:id` - Delete an address (prevents deletion of last address)

### Utility
- `GET /health` - Health check endpoint
- `GET /api/customers/:id/isSingleAddress` - Check if customer has only one address

## Installation

1. Clone the repository
2. Navigate to the server directory: `cd server`
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
5. Start the production server: `npm start`

## Environment Variables

- `PORT` - Server port (default: 3009)
- `NODE_ENV` - Environment (development/production)

## Database

The application uses SQLite with better-sqlite3 for:
- **Cross-platform compatibility** (Windows, macOS, Linux)
- **Better performance** than the original sqlite3 package
- **Automatic compilation** for the target platform
- **Transaction support** for data integrity

## Deployment on Render

This backend is optimized for deployment on Render.com:

1. **Fork/Clone** this repository to your GitHub account
2. **Connect** your repository to Render
3. **Create a new Web Service**
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `3009` (or let Render assign automatically)

### Why better-sqlite3?

The original `sqlite3` package caused deployment issues on Render due to:
- **Native module compilation** requirements
- **Platform-specific binaries** that don't match Render's Linux environment
- **ELF header errors** during deployment

`better-sqlite3` solves these issues by:
- **Automatic compilation** for the target platform
- **Better cross-platform support**
- **Improved performance** and reliability
- **Simpler deployment** process

## Development

- **Development**: `npm run dev` (uses nodemon for auto-restart)
- **Production**: `npm start`
- **Testing**: `npm test`

## API Request Examples

### Create Customer
```json
POST /api/customers
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

### Get Customers with Filtering
```
GET /api/customers?page=1&limit=10&sortBy=createdAt&order=DESC&city=New York
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Logging

Uses Winston for structured logging with timestamps and log levels.

## License

ISC
