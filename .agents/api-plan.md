# REST API Plan - Black Swan Grid (MVP)

## 1. Resources

### 1.1. Users (`app_users`)

Core resource managing user metadata, roles, and subscription state.

- **Database table**: `app_users`
- **Related**: 1:1 with Supabase Auth (`auth.users`)

### 1.2. Subscriptions

Logical resource representing subscription lifecycle managed through Stripe and stored in `app_users`.

- **Database table**: `app_users` (subscription fields)
- **External integration**: Stripe API

### 1.3. Webhook Events (`stripe_webhook_events`)

Log of Stripe webhook events with idempotency tracking.

- **Database table**: `stripe_webhook_events`

### 1.4. Subscription Audit (`subscription_audit`)

Audit trail of subscription state changes.

- **Database table**: `subscription_audit`

### 1.5. Black Swan Events (External - NocoDB)

Historical market anomaly data (not stored in Supabase).

- **External source**: NocoDB (GPW_black_swans, GPW_AI_summary)
- **Access**: Proxied through API for security

---

## 2. Endpoints

### 2.1. User Management

#### POST /api/users/initialize

Initialize user metadata record after Supabase Auth registration.

**Description**: Creates `app_users` record with 7-day trial after successful Supabase signup.

**Authentication**: Service role key or authenticated user (self-initialization)

**Request Body**:

```json
{
  "auth_uid": "uuid",
  "email": "string (optional for logging)"
}
```

**Request Body Schema (Zod)**:

```typescript
{
  auth_uid: z.string().uuid(),
  email: z.string().email().optional()
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "user": {
    "auth_uid": "uuid",
    "role": "user",
    "subscription_status": "trial",
    "trial_expires_at": "2025-12-19T12:00:00Z",
    "created_at": "2025-12-12T12:00:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid auth_uid or validation error
  ```json
  { "error": "Validation failed", "details": ["auth_uid must be a valid UUID"] }
  ```
- `409 Conflict`: User already exists
  ```json
  { "error": "User already initialized" }
  ```
- `500 Internal Server Error`: Database error
  ```json
  { "error": "Failed to initialize user" }
  ```

**Business Logic**:

- Sets `trial_expires_at = now() + interval '7 days'`
- Sets `subscription_status = 'trial'`
- Sets `role = 'user'` (default)
- Creates audit entry in `subscription_audit` with `change_type = 'trial_started'`

---

#### GET /api/users/me

Retrieve current authenticated user's profile and subscription status.

**Description**: Returns user metadata including subscription state, used by middleware for authorization.

**Authentication**: Required (Supabase session token)

**Query Parameters**: None

**Response (200 OK)**:

```json
{
  "auth_uid": "uuid",
  "role": "user",
  "subscription_status": "active",
  "trial_expires_at": null,
  "current_period_end": "2025-12-31T23:59:59Z",
  "plan_id": "pro_monthly",
  "stripe_customer_id": "cus_xxx",
  "metadata": {
    "preferences": {
      "symbols": ["CPD", "PKN"]
    }
  },
  "created_at": "2025-12-01T12:00:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session
  ```json
  { "error": "Unauthorized", "message": "Valid session required" }
  ```
- `404 Not Found`: User record not found in app_users
  ```json
  { "error": "User not found", "message": "Please complete registration" }
  ```

**Business Logic**:

- Fetches from `app_users` WHERE `auth_uid = auth.uid()`
- RLS policy enforces user can only see their own record
- Used by middleware to check access: `subscription_status IN ('trial', 'active') OR trial_expires_at > now()`

---

#### PUT /api/users/me

Update user metadata and preferences.

**Description**: Allows user to update their metadata (e.g., grid filter preferences).

**Authentication**: Required (Supabase session token)

**Request Body**:

```json
{
  "metadata": {
    "preferences": {
      "symbols": ["CPD", "PKN", "ALR"],
      "defaultRange": "week"
    }
  }
}
```

**Request Body Schema (Zod)**:

```typescript
{
  metadata: z.record(z.unknown()).optional();
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "user": {
    "auth_uid": "uuid",
    "metadata": {
      "preferences": {
        "symbols": ["CPD", "PKN", "ALR"],
        "defaultRange": "week"
      }
    },
    "updated_at": "2025-12-12T12:30:00Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session
- `400 Bad Request`: Invalid metadata format
  ```json
  { "error": "Invalid metadata format" }
  ```

**Business Logic**:

- Updates `metadata` field (JSONB merge)
- Triggers `updated_at` timestamp update

---

#### DELETE /api/users/me

Soft-delete user account (GDPR compliance).

**Description**: Sets `deleted_at` timestamp for soft-delete. Account remains in database for audit but is inaccessible.

**Authentication**: Required (Supabase session token)

**Request Body**: None

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "Account marked for deletion",
  "deleted_at": "2025-12-12T12:45:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session

**Business Logic**:

- Sets `deleted_at = now()`
- Should trigger async job to cancel Stripe subscription
- Future: schedule physical deletion after retention period

---

### 2.2. Subscription Management

#### GET /api/subscriptions/status

Get current subscription status (dedicated endpoint).

**Description**: Returns subscription-specific information. Essentially an alias/view of /api/users/me focused on subscription fields.

**Authentication**: Required (Supabase session token)

**Query Parameters**: None

**Response (200 OK)**:

```json
{
  "subscription_status": "active",
  "trial_expires_at": null,
  "current_period_end": "2025-12-31T23:59:59Z",
  "plan_id": "pro_monthly",
  "stripe_subscription_id": "sub_xxx",
  "has_access": true
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session

**Business Logic**:

- Calculates `has_access` boolean: `subscription_status IN ('trial', 'active') OR (trial_expires_at IS NOT NULL AND trial_expires_at > now())`

---

#### POST /api/subscriptions/create-checkout

Create Stripe Checkout Session for new subscription.

**Description**: Generates Stripe Checkout Session URL for user to subscribe.

**Authentication**: Required (Supabase session token)

**Request Body**:

```json
{
  "price_id": "price_xxx",
  "success_url": "https://app.example.com/success",
  "cancel_url": "https://app.example.com/cancel"
}
```

**Request Body Schema (Zod)**:

```typescript
{
  price_id: z.string().startsWith('price_'),
  success_url: z.string().url(),
  cancel_url: z.string().url()
}
```

**Response (200 OK)**:

```json
{
  "checkout_url": "https://checkout.stripe.com/pay/xxx",
  "session_id": "cs_xxx"
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session
- `400 Bad Request`: Invalid price_id or URLs
- `500 Internal Server Error`: Stripe API error
  ```json
  { "error": "Failed to create checkout session", "details": "Stripe error message" }
  ```

**Business Logic**:

- Creates Stripe Customer if `stripe_customer_id` is null in `app_users`
- Creates Checkout Session with customer ID
- Returns checkout URL for redirect

---

#### POST /api/subscriptions/create-portal

Create Stripe Customer Portal session.

**Description**: Generates Stripe Customer Portal URL for managing subscription.

**Authentication**: Required (Supabase session token)

**Request Body**:

```json
{
  "return_url": "https://app.example.com/account"
}
```

**Request Body Schema (Zod)**:

```typescript
{
  return_url: z.string().url();
}
```

**Response (200 OK)**:

```json
{
  "portal_url": "https://billing.stripe.com/session/xxx"
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session
- `404 Not Found`: No Stripe customer found
  ```json
  { "error": "No subscription found" }
  ```
- `500 Internal Server Error`: Stripe API error

**Business Logic**:

- Requires existing `stripe_customer_id` in `app_users`
- Creates portal session for customer management (cancel, update payment, etc.)

---

### 2.3. Stripe Webhooks

#### POST /api/webhooks/stripe

Process Stripe webhook events.

**Description**: Receives and processes Stripe webhook events with idempotency. Updates subscription status and creates audit trail.

**Authentication**: Stripe signature verification (webhook secret)

**Headers**:

- `stripe-signature`: Webhook signature for verification

**Request Body**: Raw Stripe event payload (verified)

**Response (200 OK)**:

```json
{
  "received": true,
  "event_id": "evt_xxx"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid signature
  ```json
  { "error": "Invalid signature" }
  ```
- `200 OK` (idempotent): Event already processed
  ```json
  { "received": true, "event_id": "evt_xxx", "already_processed": true }
  ```

**Business Logic**:

1. Verify webhook signature
2. Attempt INSERT into `stripe_webhook_events` with `event_id` (UNIQUE constraint)
3. If conflict (already exists), return 200 immediately (idempotency)
4. If new event:
   - Set `status = 'processing'`
   - Parse event type:
     - `customer.subscription.created`: Update `subscription_status = 'active'`, set `stripe_subscription_id`, `current_period_end`
     - `customer.subscription.updated`: Update subscription fields and `current_period_end`
     - `customer.subscription.deleted`: Set `subscription_status = 'canceled'`
     - `invoice.payment_succeeded`: Confirm `subscription_status = 'active'`
     - `invoice.payment_failed`: Set `subscription_status = 'past_due'`
   - Update `app_users` in same transaction
   - Insert record into `subscription_audit` with `change_type`, `previous` (old state), `current` (new state)
   - Set `processed_at = now()`, `status = 'processed'`
5. Handle errors: set `status = 'failed'`, `error = <message>`

**Processed Event Types**:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

### 2.4. NocoDB Proxy (Black Swan Data)

#### GET /api/nocodb/grid

Fetch grid data for specified date range and symbols.

**Description**: Proxies request to NocoDB GPW_black_swans table with filtering and returns formatted grid data.

**Authentication**: Required (Supabase session token) + Active subscription/trial

**Query Parameters**:

- `range`: enum('week', 'month', 'quarter') - Required
- `symbols`: comma-separated list of ticker symbols - Optional (default: all)
- `end_date`: ISO date string (YYYY-MM-DD) - Optional (default: today)

**Query Schema (Zod)**:

```typescript
{
  range: z.enum(['week', 'month', 'quarter']),
  symbols: z.string().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}
```

**Response (200 OK)**:

```json
{
  "range": "week",
  "start_date": "2025-12-05",
  "end_date": "2025-12-12",
  "events": [
    {
      "id": "rec_xxx",
      "symbol": "CPD",
      "occurrence_date": "2025-12-10",
      "event_type": "BLACK_SWAN_DOWN",
      "percent_change": -15.2,
      "has_summary": true
    },
    {
      "id": "rec_yyy",
      "symbol": "PKN",
      "occurrence_date": "2025-12-11",
      "event_type": "VOLATILITY_UP",
      "percent_change": 8.5,
      "has_summary": true
    }
  ],
  "symbols": ["CPD", "PKN", "ALR"],
  "cached_at": "2025-12-12T12:00:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session or inactive subscription
  ```json
  { "error": "Active subscription required" }
  ```
- `400 Bad Request`: Invalid parameters
  ```json
  { "error": "Validation failed", "details": ["range must be one of: week, month, quarter"] }
  ```
- `429 Too Many Requests`: Rate limit exceeded
  ```json
  { "error": "Rate limit exceeded", "retry_after": 60 }
  ```
- `500 Internal Server Error`: NocoDB fetch error
  ```json
  { "error": "Failed to fetch grid data" }
  ```

**Business Logic**:

- Validates subscription status via middleware
- Calculates date range based on `range` parameter
- Filters by `symbols` if provided
- Calls NocoDB API with filters: `occurrence_date >= start_date AND occurrence_date <= end_date`
- Optional: checks for existence of AI summary (join or flag)
- Rate limit: 60 requests/min per user
- Returns minimal payload for performance (< 1.5s target)

**Rate Limiting**:

- Implementation: In-memory Map with user_id -> {count, resetAt}
- Limit: 60 requests per minute
- Response header: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

#### GET /api/nocodb/events/:id

Fetch single event details with first AI summary.

**Description**: Returns detailed information for a specific Black Swan event, including the primary AI summary.

**Authentication**: Required (Supabase session token) + Active subscription/trial

**Path Parameters**:

- `id`: NocoDB record ID

**Query Parameters**: None

**Response (200 OK)**:

```json
{
  "id": "rec_xxx",
  "symbol": "CPD",
  "occurrence_date": "2025-12-10",
  "event_type": "BLACK_SWAN_DOWN",
  "percent_change": -15.2,
  "summary": {
    "id": "sum_xxx",
    "date": "2025-12-10 14:30",
    "summary": "Significant price drop attributed to...",
    "article_sentiment": "negative",
    "identified_causes": ["regulatory news", "earnings miss"],
    "predicted_trend_probability": {
      "further_decline": 0.65,
      "recovery": 0.35
    },
    "recommended_action": {
      "action": "HOLD",
      "justification": "Wait for market stabilization..."
    },
    "keywords": ["regulation", "earnings"],
    "source_article_url": "https://example.com/article"
  },
  "historic_data": {
    "open": 45.2,
    "close": 38.3,
    "high": 45.5,
    "low": 37.8,
    "volume": 1250000
  }
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session or inactive subscription
- `404 Not Found`: Event not found
  ```json
  { "error": "Event not found" }
  ```
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: NocoDB fetch error

**Business Logic**:

- Validates subscription status
- Fetches event from GPW_black_swans by id
- Fetches first (primary) AI summary from GPW_AI_summary
- Fetches historic data from GPW_historic_data for context
- Rate limit: 60 requests/min per user

---

#### GET /api/nocodb/summaries

Fetch all AI summaries for an event.

**Description**: Returns list of all AI summaries associated with a specific event (for full view).

**Authentication**: Required (Supabase session token) + Active subscription/trial

**Query Parameters**:

- `symbol`: ticker symbol - Required
- `occurrence_date`: ISO date (YYYY-MM-DD) - Required
- `event_type`: event type - Optional

**Query Schema (Zod)**:

```typescript
{
  symbol: z.string().min(1).max(10),
  occurrence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_type: z.enum(['BLACK_SWAN_UP', 'BLACK_SWAN_DOWN', 'VOLATILITY_UP', 'VOLATILITY_DOWN', 'BIG_MOVE']).optional()
}
```

**Response (200 OK)**:

```json
{
  "symbol": "CPD",
  "occurrence_date": "2025-12-10",
  "event_type": "BLACK_SWAN_DOWN",
  "summaries": [
    {
      "id": "sum_xxx",
      "date": "2025-12-10 14:30",
      "summary": "Initial analysis...",
      "article_sentiment": "negative",
      "identified_causes": ["regulatory news"],
      "predicted_trend_probability": { "further_decline": 0.65, "recovery": 0.35 },
      "recommended_action": { "action": "HOLD", "justification": "..." },
      "keywords": ["regulation"],
      "source_article_url": "https://example.com/article1"
    },
    {
      "id": "sum_yyy",
      "date": "2025-12-10 16:45",
      "summary": "Updated analysis with additional sources...",
      "article_sentiment": "neutral",
      "identified_causes": ["regulatory news", "market correction"],
      "predicted_trend_probability": { "further_decline": 0.45, "recovery": 0.55 },
      "recommended_action": { "action": "BUY", "justification": "..." },
      "keywords": ["regulation", "correction"],
      "source_article_url": "https://example.com/article2"
    }
  ],
  "total_summaries": 2
}
```

**Error Responses**:

- `401 Unauthorized`: No valid session or inactive subscription
- `400 Bad Request`: Missing or invalid parameters
- `404 Not Found`: No summaries found for event
  ```json
  { "error": "No summaries found" }
  ```
- `429 Too Many Requests`: Rate limit exceeded

**Business Logic**:

- Validates subscription status
- Queries GPW_AI_summary WHERE symbol = ? AND occurrence_date = ?
- Orders by date DESC (most recent first)
- Returns array of all summaries
- Rate limit: 60 requests/min per user

---

## 3. Authentication and Authorization

### 3.1. Authentication Mechanism

**Supabase Auth** with JWT tokens.

- **Registration**: Supabase Auth `/auth/v1/signup` → triggers POST /api/users/initialize
- **Login**: Supabase Auth `/auth/v1/token?grant_type=password`
- **Session management**: JWT tokens in cookies/localStorage, validated on each API request
- **Token refresh**: Automatic via Supabase client

### 3.2. Authorization Strategy

#### Middleware (Astro)

Location: `src/middleware/index.ts`

**Responsibilities**:

1. Verify Supabase session (JWT token)
2. Fetch user from `app_users` via GET /api/users/me or direct query
3. Check subscription status:
   - `subscription_status IN ('trial', 'active')` OR
   - `trial_expires_at IS NOT NULL AND trial_expires_at > now()`
4. Attach user context to `context.locals.user`
5. Redirect to login or payment page if unauthorized

**Protected routes**:

- `/` (grid page)
- `/summary/:id` (permalink)
- All `/api/*` endpoints except `/api/webhooks/stripe`

#### Row Level Security (RLS)

Implemented in Supabase/Postgres as per db-plan.md.

**app_users**:

- SELECT: `auth.uid() = auth_uid OR role = 'admin'`
- UPDATE: `auth.uid() = auth_uid OR auth.role() = 'service_role'`
- DELETE: `auth.role() = 'service_role'` (soft-delete preferred)

**stripe_webhook_events**:

- INSERT: `auth.role() = 'service_role'`
- SELECT: `auth.role() = 'service_role' OR (SELECT role FROM app_users WHERE auth_uid = auth.uid()) = 'admin'`

**subscription_audit**:

- INSERT: `auth.role() = 'service_role'`
- SELECT: `auth.role() = 'service_role' OR (SELECT role FROM app_users WHERE auth_uid = auth.uid()) = 'admin'`

### 3.3. Service Role Key

Used exclusively server-side for:

- Webhook processing (POST /api/webhooks/stripe)
- Admin operations
- NocoDB proxy calls

**Security**:

- Stored in environment variables (never exposed to client)
- Used with Supabase service role client for bypassing RLS when necessary

---

## 4. Validation and Business Logic

### 4.1. Validation Rules by Resource

#### app_users

- `auth_uid`: must be valid UUID, must match authenticated user (except service role)
- `role`: must be one of ['user', 'admin']
- `subscription_status`: must be one of ['trial', 'active', 'past_due', 'canceled', 'unpaid']
- `stripe_customer_id`: must be unique if present
- `stripe_subscription_id`: must be unique if present
- `trial_expires_at`: must be future date when subscription_status = 'trial'
- `metadata`: must be valid JSON object

#### Subscriptions (Stripe integration)

- `price_id`: must start with 'price\_' (Stripe format)
- `success_url`, `cancel_url`, `return_url`: must be valid HTTPS URLs
- Subscription creation requires valid Stripe customer
- Trial period: exactly 7 days from registration

#### NocoDB Proxy

- `range`: must be one of ['week', 'month', 'quarter']
- `symbols`: comma-separated string, each symbol max 10 characters
- `occurrence_date`, `end_date`: must be valid ISO date format (YYYY-MM-DD)
- `event_type`: must be one of ['BLACK_SWAN_UP', 'BLACK_SWAN_DOWN', 'VOLATILITY_UP', 'VOLATILITY_DOWN', 'BIG_MOVE']

#### Webhooks

- `event_id`: must be unique (idempotency)
- Stripe signature must be valid
- Payload must match expected Stripe event structure

### 4.2. Business Logic Implementation

#### Trial Logic

Implemented in: POST /api/users/initialize

- On user registration, set `subscription_status = 'trial'`
- Set `trial_expires_at = now() + interval '7 days'`
- Create audit entry: `change_type = 'trial_started'`, `current = {subscription_status: 'trial', trial_expires_at: <timestamp>}`

#### Subscription Status Updates

Implemented in: POST /api/webhooks/stripe

- Transaction-based updates (atomicity)
- Steps:
  1. Verify idempotency (INSERT to stripe_webhook_events)
  2. Capture previous state from app_users
  3. Update app_users based on event type
  4. Insert audit record with previous and current state
  5. Mark webhook as processed

Event-to-status mapping:

- `customer.subscription.created` → `subscription_status = 'active'`, clear `trial_expires_at`
- `customer.subscription.updated` → update `current_period_end`, possibly `plan_id`
- `customer.subscription.deleted` → `subscription_status = 'canceled'`
- `invoice.payment_succeeded` → `subscription_status = 'active'`
- `invoice.payment_failed` → `subscription_status = 'past_due'`

#### Access Control Logic

Implemented in: Middleware + RLS

- User has access if:
  - `subscription_status = 'active'` OR
  - `subscription_status = 'trial' AND trial_expires_at > now()`
- Admin users (`role = 'admin'`) have full access regardless of subscription
- Service role bypasses all checks

#### Rate Limiting Logic

Implemented in: NocoDB proxy endpoints

- Per-user rate limit: 60 requests per minute
- Implementation: In-memory Map structure
  ```typescript
  rateLimitStore: Map<user_id, { count: number; resetAt: timestamp }>;
  ```
- On each request:
  1. Check if user_id exists in store
  2. If resetAt < now(), reset count to 0 and set new resetAt (now() + 60s)
  3. Increment count
  4. If count > 60, return 429 with `Retry-After: <seconds until resetAt>`
  5. Include headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

#### Idempotency Logic

Implemented in: POST /api/webhooks/stripe

- Use UNIQUE constraint on `stripe_webhook_events.event_id`
- Attempt INSERT with ON CONFLICT handling:
  ```sql
  INSERT INTO stripe_webhook_events (event_id, payload, received_at, status)
  VALUES ($1, $2, now(), 'received')
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id
  ```
- If no row returned (conflict), event already processed → return 200 immediately
- If row inserted, proceed with processing

#### Soft Delete Logic

Implemented in: DELETE /api/users/me

- Set `deleted_at = now()` instead of physical delete
- RLS policies should exclude rows WHERE `deleted_at IS NOT NULL`
- Trigger async job to:
  1. Cancel Stripe subscription
  2. Schedule data purge after retention period (e.g., 30 days)
  3. Anonymize PII if required by GDPR

#### Cache Revalidation (Client-side)

Not an API endpoint, but relevant business logic:

- Client implements stale-while-revalidate pattern
- On component mount:
  1. Read from LocalStorage/in-memory cache
  2. Display cached data immediately
  3. Fetch fresh data in background
  4. Update cache and UI when fresh data arrives
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
- After 3 failures, show "Refresh" button

---

## 5. Error Handling

### 5.1. Standard Error Response Format

All errors follow consistent JSON structure:

```json
{
  "error": "Short error message",
  "message": "Detailed explanation (optional)",
  "details": ["Array of validation errors (optional)"]
}
```

### 5.2. HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Validation error or invalid parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Authenticated but insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists (e.g., duplicate user)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Unexpected server error
- `503 Service Unavailable`: External service (NocoDB, Stripe) unavailable

### 5.3. Retry Strategy

**Client-side**:

- Implement exponential backoff for failed requests: 1s, 2s, 4s
- Max 3 attempts
- After 3 failures, display error message with "Refresh" button

**Server-side**:

- Retry internal calls to NocoDB (for proxy endpoints): 2 attempts with 500ms delay
- No retry for Stripe API calls (rely on Stripe's built-in retry logic)

---

## 6. Additional Considerations

### 6.1. Performance Optimization

- **Minimal payloads**: NocoDB proxy returns only necessary fields for grid view
- **Pagination**: Admin endpoints use pagination (default 50 items)
- **Indexes**: Ensure indexes on `app_users(subscription_status)`, `app_users(current_period_end)`, `stripe_webhook_events(event_id)`
- **Connection pooling**: Use Supabase connection pooling for concurrent requests

### 6.2. Monitoring and Logging (Future)

- Log all webhook events (already captured in stripe_webhook_events table)
- Log failed API calls (error status, endpoint, user_id, timestamp)
- Monitor rate limit hits
- Track API response times (target: 95th percentile < 500ms for proxy endpoints)

### 6.3. CORS Configuration

- Allow origins: Production domain + localhost:4321 (dev)
- Allow methods: GET, POST, PUT, DELETE
- Allow headers: Content-Type, Authorization
- Credentials: true (for cookies)

### 6.4. Webhook Security

- Verify Stripe signature on every webhook request
- Use webhook secret from Stripe dashboard
- Reject webhooks with invalid signatures (400 Bad Request)
- Log rejected webhooks for security audit

### 6.5. Data Retention

- `stripe_webhook_events`: Retain for 90 days (implement CRON job for cleanup)
- `subscription_audit`: Retain indefinitely (or per compliance requirements)
- `deleted_at` users: Purge after 30 days (GDPR compliance)

### 6.6. Future Enhancements (Out of MVP Scope)

- Server-side caching with Redis for grid data
- WebSocket support for real-time updates
- Bulk operations for admin endpoints
- Advanced analytics endpoints
- Export functionality (CSV, PDF)
- Email notifications for subscription events

---

## 7. API Versioning

**Current version**: v1 (implicit)

**Strategy**:

- No version prefix in MVP (/api/users/me instead of /api/v1/users/me)
- When breaking changes required, introduce /api/v2/\* endpoints
- Maintain v1 for minimum 6 months after v2 release

---

## 8. Implementation Priorities

### Phase 1 (MVP Core)

1. POST /api/users/initialize
2. GET /api/users/me
3. POST /api/webhooks/stripe
4. GET /api/nocodb/grid
5. GET /api/nocodb/events/:id
6. Middleware implementation with subscription check

### Phase 2 (Subscription Flow)

1. POST /api/subscriptions/create-checkout
2. POST /api/subscriptions/create-portal
3. GET /api/subscriptions/status
4. PUT /api/users/me

### Phase 3 (Extended Features)

1. GET /api/nocodb/summaries
2. DELETE /api/users/me
3. Rate limiting implementation
4. Admin endpoints (if needed)

### Phase 4 (Polish)

1. Enhanced error handling
2. Logging and monitoring
3. Performance optimization
4. E2E tests for all endpoints

---

_End of API Plan_
