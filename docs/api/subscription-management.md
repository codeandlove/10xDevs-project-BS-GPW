# Subscription Management API

## Overview

The Subscription Management module handles the complete subscription lifecycle through Stripe integration. It provides three endpoints for managing user subscriptions, checkout sessions, and customer portal access.

## Endpoints

### 1. GET /api/subscriptions/status

Retrieves the current subscription status for the authenticated user.

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription_status": "active",
    "trial_expires_at": null,
    "current_period_end": "2026-01-28T23:59:59Z",
    "plan_id": "pro_monthly",
    "stripe_subscription_id": "sub_1ABC123xyz",
    "has_access": true
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - User not found
- `500` - Server error

---

### 2. POST /api/subscriptions/create-checkout

Creates a Stripe Checkout session for subscription purchase.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "price_id": "price_1ABC123xyz",
  "success_url": "https://app.example.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://app.example.com/cancel"
}
```

**Validation Rules:**
- `price_id`: Must start with `price_`
- `success_url`: Must be a valid URL from allowed domains
- `cancel_url`: Must be a valid URL from allowed domains

**Response:**
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_abc123xyz",
    "session_id": "cs_test_abc123xyz"
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error or invalid URL
- `401` - Unauthorized
- `500` - Server error

---

### 3. POST /api/subscriptions/create-portal

Creates a Stripe Customer Portal session for subscription management.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "return_url": "https://app.example.com/account"
}
```

**Validation Rules:**
- `return_url`: Must be a valid URL from allowed domains

**Response:**
```json
{
  "success": true,
  "data": {
    "portal_url": "https://billing.stripe.com/p/session/test_abc123xyz"
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error or invalid URL
- `401` - Unauthorized
- `404` - No Stripe customer found
- `500` - Server error

---

## Security

### URL Whitelist

All redirect URLs (success_url, cancel_url, return_url) must be from whitelisted domains:

**Production:**
- `https://app.blackswangrid.com`

**Development:**
- `http://localhost:4321`
- `http://localhost:3000`
- `http://127.0.0.1:4321`
- `http://127.0.0.1:3000`

### Authentication

All endpoints require a valid Bearer token from Supabase Auth:

```
Authorization: Bearer <supabase_access_token>
```

### Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Error Codes:**
- `UNAUTHORIZED` - Missing or invalid authentication
- `VALIDATION_ERROR` - Invalid request data
- `INVALID_URL` - URL not in whitelist
- `USER_NOT_FOUND` - User doesn't exist
- `NO_CUSTOMER` - No Stripe customer found
- `STRIPE_ERROR` - Stripe API error
- `DATABASE_ERROR` - Database operation failed
- `UNKNOWN_ERROR` - Unexpected error

---

## Environment Variables

Required environment variables in `.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Architecture

### Service Layer

**SubscriptionService** (`src/services/subscription.service.ts`)
- Handles business logic
- Stripe API integration
- Database operations
- Audit logging

### Validation Layer

**Zod Schemas** (`src/lib/subscription-validation.ts`)
- Request validation
- Type inference
- Error formatting

**URL Whitelist** (`src/config/allowed-domains.ts`)
- Domain validation
- Environment-based configuration

### Error Handling

**Custom Errors** (`src/lib/errors.ts`)
- Structured error hierarchy
- HTTP status code mapping
- Consistent error responses

---

## Testing

### Manual Testing with cURL

**Get Status:**
```bash
curl -X GET http://localhost:4321/api/subscriptions/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create Checkout:**
```bash
curl -X POST http://localhost:4321/api/subscriptions/create-checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price_id": "price_1ABC123xyz",
    "success_url": "http://localhost:4321/success",
    "cancel_url": "http://localhost:4321/cancel"
  }'
```

**Create Portal:**
```bash
curl -X POST http://localhost:4321/api/subscriptions/create-portal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "return_url": "http://localhost:4321/account"
  }'
```

---

## Implementation Checklist

- [x] Type definitions (subscription.types.ts)
- [x] Validation schemas (subscription-validation.ts)
- [x] Error classes (errors.ts)
- [x] Stripe client setup (stripe.ts)
- [x] URL whitelist (allowed-domains.ts)
- [x] Subscription service (subscription.service.ts)
- [x] GET /api/subscriptions/status endpoint
- [x] POST /api/subscriptions/create-checkout endpoint
- [x] POST /api/subscriptions/create-portal endpoint
- [ ] Unit tests
- [ ] Integration tests
- [ ] Production deployment
- [ ] Stripe webhook handler (separate ticket)

---

## Next Steps

1. **Install Dependencies:**
   ```bash
   npm install stripe zod
   ```

2. **Configure Environment:**
   - Add Stripe keys to `.env`
   - Verify Supabase connection

3. **Test Endpoints:**
   - Use provided cURL commands
   - Verify responses match specification

4. **Deploy:**
   - Merge to main branch
   - Configure production environment variables
   - Set up Stripe webhook endpoint

---

## Support

For issues or questions:
1. Check error logs in console
2. Verify environment variables
3. Test with Stripe test mode keys
4. Review Stripe Dashboard for API errors

