# Stripe Webhooks Implementation Guide

## Overview

The Stripe webhook endpoint (`POST /api/webhooks/stripe`) handles real-time subscription events from Stripe, updating user subscription status and maintaining an audit trail.

## Architecture

### Flow Diagram

```
Stripe Event → Webhook Endpoint → Signature Verification → Service Layer → Database Update
                    ↓                      ↓                      ↓              ↓
              Raw Body + Sig         constructEvent()      processEvent()   app_users + audit
```

### Components

1. **Endpoint** (`src/pages/api/webhooks/stripe.ts`)
   - Receives webhook POST requests
   - Verifies Stripe signature
   - Returns appropriate status codes

2. **Service** (`src/services/webhook.service.ts`)
   - Event routing and processing
   - Idempotency handling
   - Database updates with audit trail

3. **Types** (`src/types/webhook.types.ts`)
   - TypeScript definitions
   - Event and response types

4. **Errors** (`src/lib/webhook-errors.ts`)
   - Custom error classes
   - Error handling strategy

---

## Supported Events

| Event Type | Description | Action |
|------------|-------------|--------|
| `customer.subscription.created` | New subscription | Set status to `active`, save subscription ID |
| `customer.subscription.updated` | Subscription changed | Update status, period end, plan ID |
| `customer.subscription.deleted` | Subscription canceled | Set status to `canceled` |
| `invoice.payment_succeeded` | Payment succeeded | Confirm `active` status, update period |
| `invoice.payment_failed` | Payment failed | Set status to `past_due` |

---

## Setup Instructions

### 1. Configure Stripe Webhook

**In Stripe Dashboard:**

1. Navigate to **Developers → Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL:
   - **Local testing:** Use ngrok or similar tunnel
     ```bash
     ngrok http 4321
     # Use: https://your-ngrok-url.ngrok.io/api/webhooks/stripe
     ```
   - **Production:** `https://yourdomain.com/api/webhooks/stripe`

4. Select events to send:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

5. Copy **Signing secret** (starts with `whsec_`)

### 2. Set Environment Variable

Add to `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

### 3. Verify Endpoint

Test the webhook using Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:4321/api/webhooks/stripe

# Trigger test event
stripe trigger customer.subscription.created
```

---

## Security Features

### 1. Signature Verification

Every webhook request is verified using Stripe's signature:

```typescript
const signature = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
```

**Why it's important:**
- Prevents spoofed requests
- Ensures event authenticity
- Required for production

### 2. Idempotency

Duplicate events are automatically handled:

```typescript
// Database constraint prevents duplicate processing
UNIQUE INDEX on stripe_webhook_events.event_id
```

**Benefits:**
- Safe to retry failed webhooks
- Prevents double-charging or double-updates
- Automatic duplicate detection

### 3. Error Handling Strategy

| Error Type | Status Code | Stripe Retry | Reason |
|------------|-------------|--------------|--------|
| Invalid signature | 400 | ❌ No | Security violation |
| Missing signature | 400 | ❌ No | Invalid request |
| Processing error | 200 | ✅ Yes | Temporary failure |
| Database error | 200 | ✅ Yes | Transient issue |

**Why return 200 for errors?**
- Stripe retries non-200 responses for 3 days
- Processing errors are logged internally
- Prevents retry spam for permanent failures

---

## Database Schema

### stripe_webhook_events

Stores all received webhook events:

```sql
CREATE TABLE stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,  -- Stripe event ID (evt_*)
  payload JSONB NOT NULL,          -- Full Stripe event object
  status TEXT NOT NULL,            -- 'received', 'processing', 'processed', 'failed'
  user_id UUID,                    -- Linked app_users.auth_uid (if found)
  error TEXT,                      -- Error message (if failed)
  received_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_stripe_webhook_event_id ON stripe_webhook_events(event_id);
```

### subscription_audit

Tracks subscription changes:

```sql
CREATE TABLE subscription_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(auth_uid),
  change_type TEXT NOT NULL,       -- 'subscription_created', 'payment_failed', etc.
  previous JSONB,                  -- Previous subscription state
  current JSONB,                   -- New subscription state
  created_at TIMESTAMPTZ NOT NULL
);
```

---

## Event Processing Details

### customer.subscription.created

**What happens:**
1. Find user by `stripe_customer_id`
2. Update user:
   ```typescript
   {
     stripe_subscription_id: subscription.id,
     subscription_status: 'active',
     current_period_end: subscription.current_period_end,
     plan_id: subscription.items[0].price.id,
     trial_expires_at: null  // Clear trial
   }
   ```
3. Log to audit trail

**Edge cases:**
- User not found → Log warning, mark event as processed (OK)
- Duplicate subscription → Idempotency prevents double-update

### customer.subscription.updated

**What happens:**
1. Map Stripe status to our enum:
   - `active` → `active`
   - `past_due` → `past_due`
   - `canceled` / `unpaid` → `canceled`
   - `trialing` → `trial`
2. Update subscription data
3. Log change to audit

**Use cases:**
- Plan upgrade/downgrade
- Status changes (dunning)
- Period renewal

### customer.subscription.deleted

**What happens:**
1. Set `subscription_status` to `canceled`
2. Keep `current_period_end` (grace period)
3. User retains access until period end

**Note:** Stripe sends this when subscription is immediately canceled or after grace period expires.

### invoice.payment_succeeded

**What happens:**
1. Confirm subscription is `active`
2. Update `current_period_end` from invoice
3. Log successful payment

**Use cases:**
- Initial subscription payment
- Renewal payments
- Retry after failed payment

### invoice.payment_failed

**What happens:**
1. Set `subscription_status` to `past_due`
2. User loses access (depending on grace period settings)

**Stripe automatic behavior:**
- Retries payment based on your retry rules
- Sends multiple `invoice.payment_failed` events
- Eventually cancels if all retries fail

---

## Monitoring & Debugging

### Logging

All webhook events are logged with `[WEBHOOK]` prefix:

```typescript
console.log('[WEBHOOK] Received event:', { id, type, created });
console.log('[WEBHOOK] Event processed successfully:', { event_id, user_id });
console.error('[WEBHOOK] Event processing failed:', { event_id, error });
```

**Search logs:**
```bash
# Find all webhook events
grep "\\[WEBHOOK\\]" logs/*.log

# Find failures
grep "\\[WEBHOOK\\] Event processing failed" logs/*.log

# Find specific event
grep "evt_1ABC123xyz" logs/*.log
```

### Query Event Status

```sql
-- Check recent webhooks
SELECT 
  event_id,
  status,
  user_id,
  error,
  received_at,
  processed_at
FROM stripe_webhook_events
ORDER BY received_at DESC
LIMIT 50;

-- Find failed events
SELECT * FROM stripe_webhook_events
WHERE status = 'failed'
ORDER BY received_at DESC;

-- Check user's subscription history
SELECT * FROM subscription_audit
WHERE user_id = 'user-auth-uid'
ORDER BY created_at DESC;
```

### Stripe Dashboard

View webhook attempts in Stripe:
1. Go to **Developers → Webhooks**
2. Click your endpoint
3. View **Recent events** tab
4. Click event to see request/response

---

## Testing

### Local Testing with Stripe CLI

```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:4321/api/webhooks/stripe

# In another terminal, trigger events:
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### Manual Testing with cURL

```bash
# This will fail (invalid signature) - for testing error handling
curl -X POST http://localhost:4321/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{}'

# Expected response: 400 Bad Request
```

### Testing Idempotency

```bash
# Send same event twice
EVENT_ID="evt_test_12345"

# First request - should process
stripe trigger customer.subscription.created

# Second request - should return already_processed: true
# (Stripe CLI doesn't support this, need to do manually)
```

---

## Troubleshooting

### Problem: Webhook returns 400 "Invalid signature"

**Causes:**
- Wrong `STRIPE_WEBHOOK_SECRET`
- Using test secret with live mode (or vice versa)
- Body modified before verification

**Solution:**
1. Verify environment variable matches Stripe Dashboard
2. Check if using correct mode (test vs live)
3. Ensure raw body is passed to `constructEvent()`

### Problem: Events not being processed

**Check:**
```sql
SELECT * FROM stripe_webhook_events
WHERE status = 'failed'
ORDER BY received_at DESC LIMIT 10;
```

**Common causes:**
- Database connection error
- Missing user (customer not linked)
- Supabase RLS blocking writes

**Solution:**
- Check service logs for errors
- Verify user exists with matching `stripe_customer_id`
- Use service_role client for webhooks (bypasses RLS)

### Problem: Duplicate events processed

**Should not happen** due to unique constraint.

**If it does:**
1. Check database constraint exists:
   ```sql
   SELECT * FROM pg_indexes
   WHERE tablename = 'stripe_webhook_events'
   AND indexname = 'ux_stripe_webhook_event_id';
   ```
2. Verify `checkEventExists()` is called before processing

---

## Performance Considerations

### Response Time

Target: < 5 seconds (Stripe timeout is 30s)

**Bottlenecks:**
- Database queries (SELECT + 2 INSERTs + 1 UPDATE)
- Network latency to Supabase

**Optimization:**
- Use connection pooling
- Consider async processing for scale (Bull queue)

### Concurrent Webhooks

Stripe may send multiple events simultaneously.

**Safe due to:**
- Unique constraint on `event_id`
- Atomic database transactions
- Idempotent operations

---

## Production Checklist

- [ ] `STRIPE_WEBHOOK_SECRET` configured
- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] Events selected: subscription.* and invoice.*
- [ ] Database tables created (stripe_webhook_events, subscription_audit)
- [ ] Unique index on event_id exists
- [ ] RLS policies allow service writes
- [ ] Monitoring/alerting configured
- [ ] Test webhook with Stripe CLI
- [ ] Verify signature verification works
- [ ] Check idempotency (duplicate event test)
- [ ] Review error logs for first 24 hours

---

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

---

## Support

For issues:
1. Check `stripe_webhook_events` table for failed events
2. Review application logs with `[WEBHOOK]` prefix
3. Verify Stripe Dashboard shows successful delivery
4. Test with Stripe CLI in local environment

