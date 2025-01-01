# Payment System

A secure and scalable payment processing system built with TypeScript and Node.js, featuring Stripe integration, user authentication, and comprehensive transaction management.

## Features

- **Secure Payment Processing**: Integration with Stripe for secure payment handling
- **User Authentication**: JWT-based authentication system
- **Role-based Access Control**: Admin and user role management
- **Transaction Management**: Robust payment transaction handling
- **Webhook Integration**: Stripe webhook support for payment status updates
- **Rate Limiting**: Protection against abuse
- **Error Handling**: Comprehensive error management system

## Technology Stack

- Node.js
- TypeScript
- Express.js
- MongoDB
- Redis (for rate limiting)
- Stripe API
- JWT Authentication
- Jest (Testing)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis Server
- Stripe Account
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Soking511/Payment_Integration
cd payment-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your configuration:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/payment
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

4. Start the service:
```bash
npm run start
```

## API Documentation

### Authentication

#### Register User
```http
POST /api/users/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe"
}
```

#### Login
```http
POST /api/users/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123"
}
```

### Payments

#### Create Payment
```http
POST /api/payments
Authorization: Bearer {token}
Content-Type: application/json

{
    "amount": 1000,
    "currency": "USD",
    "description": "Payment for service",
    "paymentMethodId": "pm_card_visa"
}
```

#### Get Payment Status
```http
GET /api/payments/{paymentId}
Authorization: Bearer {token}
```

### User Management

#### Get User Profile
```http
GET /api/users/{userId}
Authorization: Bearer {token}
```

#### Update User
```http
PUT /api/users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
    "name": "Updated Name",
    "email": "updated@example.com"
}
```

## Security Features

- JWT Authentication
- Role-based Access Control
- Rate Limiting
- Request Validation
- Secure Password Hashing
- CORS Protection
- Helmet Security Headers

## Transaction Management

The system implements a robust transaction management system with:
- Atomic operations
- Rollback mechanisms
- Transaction logging
- Error recovery

## Webhook Handling

Stripe webhooks are handled for:
- Payment success/failure events
- Refund events
- Dispute events
- Account updates

## Error Handling

- Global error handling middleware
- Custom API error classes
- Validation error handling
- Async error wrapper
- Comprehensive error logging

## Testing

Run the test suite:
```bash
npm run test
```

Run with coverage:
```bash
npm run test:coverage
```

## Monitoring

- Health check endpoints
- Transaction monitoring
- Error rate monitoring
- Performance metrics

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
