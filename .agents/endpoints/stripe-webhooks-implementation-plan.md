# API Endpoint Implementation Plan: Stripe Webhooks (2.3)

## 1. Przegląd punktu końcowego

Endpoint **POST /api/webhooks/stripe** jest kluczowym elementem integracji ze Stripe, odpowiedzialnym za:

- **Odbieranie webhook events** od Stripe (customer.subscription.*, invoice.*)
- **Weryfikację podpisu Stripe** dla bezpieczeństwa
- **Idempotentne przetwarzanie** eventów (zapobieganie duplikatom)
- **Aktualizację stanu subskrypcji** w `app_users`
- **Tworzenie audit trail** w `subscription_audit`
- **Obsługę błędów** z retry mechanism

Webhook działa asynchronicznie - Stripe wysyła eventy, a endpoint przetwarza je w tle, aktualizując stan aplikacji.

### Obsługiwane typy eventów:

1. `customer.subscription.created` - Nowa subskrypcja utworzona
2. `customer.subscription.updated` - Zmiana w subskrypcji (upgrade, downgrade)
3. `customer.subscription.deleted` - Subskrypcja anulowana
4. `invoice.payment_succeeded` - Płatność zakończona sukcesem
5. `invoice.payment_failed` - Płatność nieudana

---

## 2. Szczegóły żądania

### 2.1. POST /api/webhooks/stripe

**Metoda HTTP:** POST  
**Struktura URL:** `/api/webhooks/stripe`  
**Autentykacja:** Stripe signature verification (NOT Bearer token)

**Parametry:**
- Wymagane Headers:
  - `stripe-signature` (string) - Webhook signature od Stripe
  - `content-type: application/json`
- Opcjonalne: Brak

**Request Body:** Raw Stripe event payload (JSON)

**Przykładowy payload (customer.subscription.created):**
```json
{
  "id": "evt_1ABC123xyz",
  "object": "event",
  "api_version": "2024-12-18.acacia",
  "created": 1703764800,
  "data": {
    "object": {
      "id": "sub_1ABC123xyz",
      "object": "subscription",
      "customer": "cus_ABC123xyz",
      "status": "active",
      "current_period_end": 1706356800,
      "current_period_start": 1703764800,
      "items": {
        "data": [
          {
            "id": "si_ABC123",
            "price": {
              "id": "price_ABC123",
              "product": "prod_ABC123"
            }
          }
        ]
      },
      "metadata": {}
    }
  },
  "type": "customer.subscription.created"
}
```

**Uwaga:** Request body musi być w **raw format** (nie parsowany), aby weryfikacja signature działała poprawnie.

---

## 3. Wykorzystywane typy

### 3.1. Request Types

```typescript
// src/types/webhook.types.ts

import type Stripe from 'stripe';

/**
 * Stripe webhook event type
 */
export type StripeWebhookEvent = Stripe.Event;

/**
 * Supported webhook event types
 */
export type WebhookEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed';

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  received: boolean;
  event_id: string;
  already_processed?: boolean;
  user_id?: string;
  changes_applied?: boolean;
}
```

### 3.2. Database Types

```typescript
// src/types/webhook.types.ts (continued)

/**
 * Webhook event record for database
 */
export interface WebhookEventRecord {
  id?: string;
  event_id: string;
  payload: Record<string, unknown>;
  received_at?: string;
  processed_at?: string | null;
  status?: 'received' | 'processing' | 'processed' | 'failed';
  error?: string | null;
  user_id?: string | null;
}

/**
 * Subscription update data
 */
export interface SubscriptionUpdateData {
  stripe_subscription_id?: string;
  subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  current_period_end?: string;
  plan_id?: string;
  updated_at?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  user_id: string;
  change_type: string;
  previous: Record<string, unknown> | null;
  current: Record<string, unknown> | null;
}
```

### 3.3. Service Types

```typescript
// src/services/webhook.service.ts

export interface ProcessEventParams {
  event: StripeWebhookEvent;
}

export interface ProcessEventResult {
  success: boolean;
  user_id?: string;
  changes_applied: boolean;
  error?: string;
}
```

---

## 4. Szczegóły odpowiedzi

### 4.1. Success (200 OK)

**Nowy event przetworzony:**
```json
{
  "received": true,
  "event_id": "evt_1ABC123xyz"
}
```

**Event już przetworzony (idempotent):**
```json
{
  "received": true,
  "event_id": "evt_1ABC123xyz",
  "already_processed": true
}
```

### 4.2. Error Responses

**400 Bad Request - Invalid signature:**
```json
{
  "error": "Invalid signature"
}
```

**500 Internal Server Error - Processing failed:**
```json
{
  "error": "Failed to process webhook"
}
```

**Uwaga:** Stripe retry mechanism:
- Stripe automatycznie retry'uje failed webhooks przez 3 dni
- Należy zawsze zwrócić 200 OK po zapisaniu eventu (nawet jeśli processing failed)
- Błędy processingowe zapisać w `stripe_webhook_events.error`

---

## 5. Przepływ danych

### 5.1. Główny przepływ webhook processing

```
Stripe sends webhook
    ↓
[1] Receive raw request body + stripe-signature header
    ↓
[2] Verify Stripe signature
    - stripe.webhooks.constructEvent(body, signature, secret)
    - If invalid → Return 400 Bad Request
    ↓
[3] Extract event_id from verified event
    ↓
[4] Attempt idempotent INSERT to stripe_webhook_events
    - INSERT ... ON CONFLICT (event_id) DO NOTHING
    - RETURNING id to check if inserted
    ↓
[5] Check if event already exists
    ├─ EXISTS → Return 200 OK { already_processed: true }
    │
    └─ NEW EVENT → Continue processing
        ↓
[6] Update webhook record: status = 'processing'
        ↓
[7] Determine event type and extract data
        ├─ customer.subscription.created
        ├─ customer.subscription.updated
        ├─ customer.subscription.deleted
        ├─ invoice.payment_succeeded
        └─ invoice.payment_failed
        ↓
[8] Find user by stripe_customer_id or stripe_subscription_id
    - Query app_users WHERE stripe_customer_id = event.data.object.customer
    - If not found → Log warning, mark as processed (user might not exist yet)
        ↓
[9] Get current user state (for audit 'previous')
        ↓
[10] Calculate new subscription state based on event type
        ↓
[11] BEGIN TRANSACTION
    ├─ [11a] Update app_users with new state
    ├─ [11b] Insert to subscription_audit (previous + current)
    ├─ [11c] Update stripe_webhook_events:
    │         - processed_at = now()
    │         - status = 'processed'
    │         - user_id = auth_uid (for linking)
    └─ COMMIT
        ↓
[12] Return 200 OK { received: true, event_id }
```

### 5.2. Event Type Processing Details

#### A) customer.subscription.created

```typescript
{
  subscription_status: 'active',
  stripe_subscription_id: event.data.object.id,
  current_period_end: new Date(event.data.object.current_period_end * 1000).toISOString(),
  plan_id: event.data.object.items.data[0].price.id,
  trial_expires_at: null // Clear trial when subscription activates
}
```

#### B) customer.subscription.updated

```typescript
{
  subscription_status: event.data.object.status, // 'active', 'past_due', etc.
  current_period_end: new Date(event.data.object.current_period_end * 1000).toISOString(),
  plan_id: event.data.object.items.data[0].price.id
}
```

#### C) customer.subscription.deleted

```typescript
{
  subscription_status: 'canceled',
  current_period_end: event.data.object.canceled_at 
    ? new Date(event.data.object.canceled_at * 1000).toISOString()
    : current_period_end // Keep existing if not provided
}
```

#### D) invoice.payment_succeeded

```typescript
{
  subscription_status: 'active', // Confirm active status
  current_period_end: event.data.object.lines.data[0].period.end
    ? new Date(event.data.object.lines.data[0].period.end * 1000).toISOString()
    : current_period_end
}
```

#### E) invoice.payment_failed

```typescript
{
  subscription_status: 'past_due' // Mark as past due
  // Keep other fields unchanged
}
```

### 5.3. Interakcje zewnętrzne

- **Stripe API**: Tylko do weryfikacji signature (nie ma innych wywołań)
- **Supabase**: 
  - INSERT/UPDATE `stripe_webhook_events`
  - Query/UPDATE `app_users`
  - INSERT `subscription_audit`
- **Transakcje**: Wszystkie operacje DB w jednej transakcji dla spójności

---

## 6. Względy bezpieczeństwa

### 6.1. Weryfikacja Stripe Signature

**Kluczowy element bezpieczeństwa:**

```typescript
import Stripe from 'stripe';

const signature = request.headers.get('stripe-signature');
const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

if (!signature) {
  return new Response(JSON.stringify({ error: 'Missing signature' }), { 
    status: 400 
  });
}

try {
  const event = stripe.webhooks.constructEvent(
    rawBody, // RAW body (not parsed JSON!)
    signature,
    webhookSecret
  );
  // Event verified ✓
} catch (err) {
  console.error('Signature verification failed:', err);
  return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
    status: 400 
  });
}
```

**Wymagania:**
- Request body musi być w **raw format** (Buffer lub string)
- Astro endpoint: użyć `request.text()` zamiast `request.json()`
- `STRIPE_WEBHOOK_SECRET` musi być z Stripe Dashboard (whsec_*)

### 6.2. Idempotencja

**Ochrona przed duplicate processing:**

1. **Database constraint**: UNIQUE index na `stripe_webhook_events.event_id`
2. **INSERT ... ON CONFLICT**: Atomowa operacja sprawdzająca duplikaty
3. **Immediate return**: Jeśli event istnieje, zwróć 200 OK natychmiast

```typescript
const { data: inserted, error } = await supabase
  .from('stripe_webhook_events')
  .insert({
    event_id: event.id,
    payload: event,
    received_at: new Date().toISOString(),
    status: 'received'
  })
  .select('id')
  .single();

if (error?.code === '23505') { // Duplicate key
  return new Response(
    JSON.stringify({ received: true, event_id: event.id, already_processed: true }),
    { status: 200 }
  );
}
```

### 6.3. Rate Limiting & DDoS Protection

- **Stripe IP Whitelist**: Opcjonalnie whitelist Stripe IPs (zaawansowane)
- **Timeout**: Webhook processing max 30s (Stripe timeout)
- **Async Processing**: Dla MVP processing synchroniczny; dla scale rozważyć queue (Bull/BullMQ)

### 6.4. Secrets Management

```bash
# .env (NEVER commit!)
STRIPE_WEBHOOK_SECRET=whsec_...  # Different from STRIPE_SECRET_KEY
```

**Konfiguracja w Stripe Dashboard:**
1. Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: customer.subscription.*, invoice.payment_*
4. Copy webhook signing secret → `.env`

### 6.5. RLS Bypass

- Webhook endpoint używa **service_role** Supabase client
- Bypass RLS policies (webhooks nie mają user context)
- Zabezpieczenie: tylko verified Stripe requests mogą wywołać endpoint

---

## 7. Obsługa błędów

### 7.1. Error Hierarchy

```typescript
// src/lib/webhook-errors.ts

export class WebhookError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

export class SignatureVerificationError extends WebhookError {
  constructor(message: string = 'Invalid webhook signature') {
    super(message, 'INVALID_SIGNATURE', 400, false);
  }
}

export class EventProcessingError extends WebhookError {
  constructor(message: string, retryable: boolean = true) {
    super(message, 'PROCESSING_ERROR', 500, retryable);
  }
}

export class UserNotFoundError extends WebhookError {
  constructor(customerId: string) {
    super(`User not found for customer: ${customerId}`, 'USER_NOT_FOUND', 404, false);
  }
}
```

### 7.2. Scenariusze błędów

| Scenariusz | Status | Retry | Handling |
|------------|--------|-------|----------|
| Brak signature header | 400 | ❌ | Return immediately |
| Nieprawidłowy signature | 400 | ❌ | Return immediately (potential attack) |
| Duplicate event_id | 200 | ❌ | Return { already_processed: true } |
| User nie znaleziony | 200 | ❌ | Log warning, mark processed (user may not exist yet) |
| Błąd DB (transient) | 200 | ✅ | Log error, set status='failed', Stripe retry |
| Nieznany event type | 200 | ❌ | Log info, mark processed (ignore) |
| Błąd w transaction | 200 | ✅ | Rollback, log error, Stripe retry |
| Timeout (>30s) | 200 | ✅ | Stripe retry automatically |

### 7.3. Error Handling Pattern

```typescript
export const POST: APIRoute = async ({ request }) => {
  let eventId = 'unknown';
  
  try {
    // [1] Get raw body
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      throw new SignatureVerificationError('Missing signature header');
    }
    
    // [2] Verify signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      eventId = event.id;
    } catch (err) {
      throw new SignatureVerificationError();
    }
    
    // [3] Process with idempotency
    const result = await webhookService.processEvent(event);
    
    return new Response(
      JSON.stringify({ received: true, event_id: eventId, ...result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    if (error instanceof SignatureVerificationError) {
      console.error('[WEBHOOK] Signature verification failed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // For all other errors, return 200 to prevent Stripe retries on permanent failures
    console.error('[WEBHOOK] Processing error:', error);
    
    // Log to webhook_events table if we have event_id
    if (eventId !== 'unknown') {
      await logWebhookError(eventId, error);
    }
    
    return new Response(
      JSON.stringify({ received: true, event_id: eventId, error: 'Processing failed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### 7.4. Logging Strategy

```typescript
// Detailed logging for debugging

console.log('[WEBHOOK] Received event:', {
  id: event.id,
  type: event.type,
  created: new Date(event.created * 1000).toISOString()
});

console.log('[WEBHOOK] Processing event:', {
  event_id: event.id,
  type: event.type,
  customer: subscription?.customer,
  subscription: subscription?.id
});

console.log('[WEBHOOK] Updated user:', {
  auth_uid: user.auth_uid,
  old_status: previousState.subscription_status,
  new_status: newState.subscription_status
});

console.error('[WEBHOOK] Error:', {
  event_id: event.id,
  error: error.message,
  stack: error.stack
});
```

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

1. **Database transactions**: Atomic updates mogą być wolne (50-200ms)
2. **Stripe signature verification**: ~5-10ms (akceptowalne)
3. **JSON parsing**: Large payloads (~2-5ms)
4. **Concurrent webhooks**: Stripe może wysłać wiele eventów jednocześnie

### 8.2. Optymalizacje

#### 8.2.1. Transaction Optimization

```typescript
// Use Supabase RPC for atomic operations
const { data, error } = await supabase.rpc('process_subscription_webhook', {
  p_event_id: event.id,
  p_customer_id: customerId,
  p_subscription_data: newState
});
```

**Benefits:**
- Pojedyncze wywołanie zamiast 3-4 queries
- Transakcja zarządzana przez Postgres
- Reduced network latency

#### 8.2.2. Selective Processing

```typescript
const SUPPORTED_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed'
];

if (!SUPPORTED_EVENTS.includes(event.type)) {
  // Quick return for unsupported events
  await logWebhookEvent(event.id, event, 'ignored');
  return { received: true, event_id: event.id };
}
```

#### 8.2.3. Database Indexes

Ensure indexes exist (from db-plan.md):
- `ux_stripe_webhook_event_id` (UNIQUE) - Idempotency
- `idx_app_users_stripe_customer_id` - Fast user lookup
- `idx_app_users_stripe_subscription_id` - Alternative lookup

### 8.3. Monitoring Metrics

**Key metrics:**
- Webhook processing time (p50, p95, p99)
- Success rate (processed / received)
- Error rate by event type
- Retry rate from Stripe
- DB transaction duration

**Alerts:**
- Processing time > 5s (approaching timeout)
- Error rate > 10% in 5 min window
- Duplicate event rate > 5% (potential issues)

---

## 9. Etapy wdrożenia

### 9.1. Prerequisites (Priorytet: Wysoki)

**Czas: 20 min**

1. **Verify Stripe SDK installed** (from 2.2 implementation)
   ```bash
   # Should already exist
   npm list stripe
   ```

2. **Add webhook secret to environment**
   ```env
   # .env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Configure Stripe Dashboard**
   - Navigate to Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/webhooks/stripe` (use ngrok for local testing)
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy signing secret → `.env`

---

### 9.2. Type Definitions (Priorytet: Wysoki)

**Czas: 30 min**

1. **Create `src/types/webhook.types.ts`**
   - Add all types from Section 3
   - Export interfaces for service layer

2. **Extend existing types** if needed
   - Ensure `Database` types support webhook operations

---

### 9.3. Webhook Service (Priorytet: Wysoki)

**Czas: 3 godziny**

1. **Create `src/services/webhook.service.ts`**

   **Key methods:**

   a. `processEvent(event: Stripe.Event): Promise<ProcessEventResult>`
   ```typescript
   async processEvent(event: Stripe.Event) {
     // [1] Check if already processed
     const existing = await this.checkEventExists(event.id);
     if (existing) {
       return { success: true, already_processed: true };
     }
     
     // [2] Log event
     await this.logWebhookEvent(event, 'processing');
     
     // [3] Process based on type
     try {
       const result = await this.handleEventType(event);
       
       // [4] Mark as processed
       await this.markEventProcessed(event.id, result.user_id);
       
       return { success: true, ...result };
     } catch (error) {
       // [5] Mark as failed
       await this.markEventFailed(event.id, error.message);
       throw error;
     }
   }
   ```

   b. `handleEventType(event: Stripe.Event)`
   ```typescript
   private async handleEventType(event: Stripe.Event) {
     switch (event.type) {
       case 'customer.subscription.created':
         return this.handleSubscriptionCreated(event);
       
       case 'customer.subscription.updated':
         return this.handleSubscriptionUpdated(event);
       
       case 'customer.subscription.deleted':
         return this.handleSubscriptionDeleted(event);
       
       case 'invoice.payment_succeeded':
         return this.handlePaymentSucceeded(event);
       
       case 'invoice.payment_failed':
         return this.handlePaymentFailed(event);
       
       default:
         console.log(`[WEBHOOK] Ignoring event type: ${event.type}`);
         return { changes_applied: false };
     }
   }
   ```

   c. `handleSubscriptionCreated(event)`
   ```typescript
   private async handleSubscriptionCreated(event: Stripe.Event) {
     const subscription = event.data.object as Stripe.Subscription;
     
     // Find user by customer ID
     const user = await this.findUserByCustomer(subscription.customer as string);
     if (!user) {
       console.warn(`[WEBHOOK] User not found for customer: ${subscription.customer}`);
       return { changes_applied: false };
     }
     
     // Get current state for audit
     const previousState = { ...user };
     
     // Calculate new state
     const newState: SubscriptionUpdateData = {
       stripe_subscription_id: subscription.id,
       subscription_status: 'active',
       current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
       plan_id: subscription.items.data[0]?.price?.id || null,
       updated_at: new Date().toISOString()
     };
     
     // Update in transaction
     await this.updateUserWithAudit(user.auth_uid, previousState, newState, 'subscription_created');
     
     return { user_id: user.auth_uid, changes_applied: true };
   }
   ```

   d. `updateUserWithAudit(authUid, previous, current, changeType)`
   ```typescript
   private async updateUserWithAudit(
     authUid: string,
     previousState: any,
     newState: SubscriptionUpdateData,
     changeType: string
   ) {
     // Use transaction
     const { error: updateError } = await this.supabase
       .from('app_users')
       .update(newState)
       .eq('auth_uid', authUid);
     
     if (updateError) throw updateError;
     
     // Log audit
     const { error: auditError } = await this.supabase
       .from('subscription_audit')
       .insert({
         user_id: authUid,
         change_type: changeType,
         previous: {
           subscription_status: previousState.subscription_status,
           current_period_end: previousState.current_period_end,
           plan_id: previousState.plan_id
         },
         current: {
           subscription_status: newState.subscription_status,
           current_period_end: newState.current_period_end,
           plan_id: newState.plan_id
         }
       });
     
     if (auditError) throw auditError;
   }
   ```

   e. Implement remaining handlers (`handleSubscriptionUpdated`, `handleSubscriptionDeleted`, etc.)

2. **Add helper methods**:
   - `checkEventExists(eventId)`
   - `logWebhookEvent(event, status)`
   - `markEventProcessed(eventId, userId)`
   - `markEventFailed(eventId, error)`
   - `findUserByCustomer(customerId)`
   - `findUserBySubscription(subscriptionId)`

---

### 9.4. API Endpoint (Priorytet: Wysoki)

**Czas: 1.5 godziny**

1. **Create `src/pages/api/webhooks/stripe.ts`**

```typescript
/**
 * POST /api/webhooks/stripe
 * 
 * Stripe webhook handler for subscription events
 * Processes customer.subscription.* and invoice.* events
 */
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { WebhookService } from '@/services/webhook.service';
import { createSupabaseServiceClient } from '@/lib/supabase-service';

export const prerender = false;

const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET');
}

export const POST: APIRoute = async ({ request }) => {
  let eventId = 'unknown';
  
  try {
    // [1] Get raw body (required for signature verification)
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('[WEBHOOK] Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // [2] Verify Stripe signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      eventId = event.id;
      
      console.log('[WEBHOOK] Verified event:', {
        id: event.id,
        type: event.type,
        created: new Date(event.created * 1000).toISOString()
      });
    } catch (err) {
      console.error('[WEBHOOK] Signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // [3] Process event with service (uses service_role client)
    const supabase = createSupabaseServiceClient();
    const webhookService = new WebhookService(supabase);
    
    const result = await webhookService.processEvent(event);
    
    console.log('[WEBHOOK] Processing complete:', {
      event_id: eventId,
      success: result.success,
      changes_applied: result.changes_applied
    });
    
    // [4] Return success (always 200 to Stripe)
    return new Response(
      JSON.stringify({
        received: true,
        event_id: eventId,
        already_processed: result.already_processed || false
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    // Log error but return 200 to prevent Stripe retries on permanent failures
    console.error('[WEBHOOK] Processing error:', {
      event_id: eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return 200 with error info (Stripe will see it as received)
    return new Response(
      JSON.stringify({
        received: true,
        event_id: eventId,
        error: 'Processing failed (logged)'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

2. **Create `src/lib/supabase-service.ts`** (if not exists)
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase service role credentials');
}

/**
 * Create Supabase client with service role (bypass RLS)
 * USE ONLY FOR SERVER-SIDE OPERATIONS!
 */
export function createSupabaseServiceClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

---

### 9.5. Error Classes (Priorytet: Średni)

**Czas: 30 min**

1. **Create `src/lib/webhook-errors.ts`**
   - Implement error hierarchy from Section 7.1
   - Export all error classes

---

### 9.6. Database Verification (Priorytet: Wysoki)

**Czas: 30 min**

1. **Verify indexes exist**:
   ```sql
   -- Check in Supabase SQL Editor
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename IN ('stripe_webhook_events', 'app_users', 'subscription_audit');
   ```

2. **Verify RLS policies** (should allow service_role):
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('stripe_webhook_events', 'app_users', 'subscription_audit');
   ```

3. **Create test data** for development:
   ```sql
   -- Insert test user
   INSERT INTO app_users (auth_uid, stripe_customer_id, subscription_status)
   VALUES ('00000000-0000-0000-0000-000000000001', 'cus_test123', 'trial');
   ```

---

### 9.7. Local Testing Setup (Priorytet: Wysoki)

**Czas: 1 godzina**

1. **Install Stripe CLI**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Linux
   wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
   tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
   ```

2. **Login to Stripe CLI**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local endpoint**
   ```bash
   stripe listen --forward-to localhost:4321/api/webhooks/stripe
   # Copy webhook signing secret (whsec_...) to .env
   ```

4. **Trigger test events**
   ```bash
   # Test subscription created
   stripe trigger customer.subscription.created
   
   # Test payment succeeded
   stripe trigger invoice.payment_succeeded
   
   # Test payment failed
   stripe trigger invoice.payment_failed
   ```

5. **Verify in logs**:
   - Check Astro console for `[WEBHOOK]` logs
   - Query `stripe_webhook_events` table
   - Verify `app_users` updated
   - Check `subscription_audit` entries

---

### 9.8. Integration Testing (Priorytet: Średni)

**Czas: 2 godziny**

1. **Test idempotency**:
   ```bash
   # Send same event twice
   stripe events resend evt_xxxxx
   stripe events resend evt_xxxxx
   # Verify only one record in stripe_webhook_events
   ```

2. **Test each event type**:
   - Create subscription → verify user.subscription_status = 'active'
   - Update subscription → verify fields updated
   - Delete subscription → verify status = 'canceled'
   - Payment succeeded → verify status = 'active'
   - Payment failed → verify status = 'past_due'

3. **Test error scenarios**:
   - Invalid signature (modify header manually)
   - User not found (send webhook for non-existent customer)
   - Database error (temporarily break DB connection)

4. **Test audit trail**:
   - Verify `subscription_audit` has correct previous/current states
   - Verify timestamps are correct
   - Verify user_id links properly

---

### 9.9. Unit Tests (Priorytet: Średni)

**Czas: 3 godziny**

1. **Test `webhook.service.ts`**

```typescript
// src/services/webhook.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from './webhook.service';
import type Stripe from 'stripe';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockSupabase: any;
  
  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
        update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn() })) })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) }))
      }))
    };
    
    service = new WebhookService(mockSupabase);
  });
  
  describe('handleSubscriptionCreated', () => {
    it('should update user to active status', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
            status: 'active',
            current_period_end: 1735689600,
            items: {
              data: [{ price: { id: 'price_test' } }]
            }
          }
        }
      } as Stripe.Event;
      
      // Mock user lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                auth_uid: 'user_test',
                subscription_status: 'trial'
              }
            }))
          }))
        }))
      });
      
      const result = await service['handleSubscriptionCreated'](mockEvent);
      
      expect(result.changes_applied).toBe(true);
      expect(result.user_id).toBe('user_test');
    });
    
    it('should handle user not found gracefully', async () => {
      const mockEvent = { /* ... */ } as Stripe.Event;
      
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null }))
          }))
        }))
      });
      
      const result = await service['handleSubscriptionCreated'](mockEvent);
      
      expect(result.changes_applied).toBe(false);
    });
  });
  
  // More tests for other event handlers...
});
```

2. **Test endpoint** (mock Stripe verification):
   - Test valid signature
   - Test invalid signature
   - Test duplicate events
   - Test unsupported event types

---

### 9.10. Monitoring & Alerts (Priorytet: Niski)

**Czas: 2 godziny**

1. **Add structured logging**:
   ```typescript
   // src/lib/webhook-logger.ts
   export function logWebhookEvent(event: any, stage: string, data?: any) {
     console.log(JSON.stringify({
       timestamp: new Date().toISOString(),
       type: 'webhook',
       event_id: event.id,
       event_type: event.type,
       stage,
       ...data
     }));
   }
   ```

2. **Setup error monitoring** (optional):
   - Sentry integration dla production errors
   - Email alerts dla critical failures

3. **Create admin dashboard query**:
   ```sql
   -- Recent webhook events
   SELECT 
     event_id, 
     status, 
     received_at, 
     processed_at,
     error
   FROM stripe_webhook_events
   ORDER BY received_at DESC
   LIMIT 50;
   
   -- Failed webhooks
   SELECT * FROM stripe_webhook_events
   WHERE status = 'failed'
   ORDER BY received_at DESC;
   ```

---

### 9.11. Documentation (Priorytet: Niski)

**Czas: 1 godzina**

1. **Create webhook testing guide** (`docs/webhooks-testing.md`):
   - How to test locally with Stripe CLI
   - List of test event IDs
   - Common troubleshooting

2. **Update README**:
   - Add webhook setup instructions
   - Document environment variables
   - Link to Stripe webhook docs

3. **Add inline documentation**:
   - JSDoc comments for all public methods
   - Explain complex logic (idempotency, transaction handling)

---

### 9.12. Production Deployment (Priorytet: Wysoki)

**Czas: 1 godzina**

1. **Pre-deployment checklist**:
   - [ ] `STRIPE_WEBHOOK_SECRET` configured in production
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
   - [ ] Database indexes created
   - [ ] RLS policies allow service_role
   - [ ] Endpoint accessible from internet (not behind auth)

2. **Configure production webhook in Stripe**:
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events (same as development)
   - Copy signing secret → production env

3. **Deploy**:
   - Merge to main branch
   - GitHub Actions deploy
   - Verify endpoint responds 200 OK

4. **Post-deployment verification**:
   - Trigger test event from Stripe Dashboard
   - Check logs for successful processing
   - Verify database updated correctly
   - Monitor error rate in Stripe Dashboard

5. **Enable webhook retry**:
   - Stripe automatically retries for 3 days
   - Configure retry settings in Dashboard if needed

---

## 10. Podsumowanie implementacji

### Pliki do utworzenia:

1. `src/types/webhook.types.ts` - Type definitions
2. `src/services/webhook.service.ts` - Core webhook processing logic
3. `src/pages/api/webhooks/stripe.ts` - API endpoint
4. `src/lib/webhook-errors.ts` - Custom error classes
5. `src/lib/supabase-service.ts` - Service role client
6. `src/lib/webhook-logger.ts` - Structured logging (optional)
7. `docs/webhooks-testing.md` - Testing documentation

### Pliki do modyfikacji:

1. `.env` - Add `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
2. Database migrations (verify indexes/RLS exist)

### Nowe environment variables:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Dependencies:

- `stripe` (już zainstalowane z 2.2)
- `@supabase/supabase-js` (już zainstalowane)

### Szacowany czas implementacji: 14-16 godzin

### Kolejność priorytetów:

1. **High Priority** (MVP critical):
   - Prerequisites (9.1)
   - Type Definitions (9.2)
   - Webhook Service (9.3)
   - API Endpoint (9.4)
   - Database Verification (9.6)
   - Local Testing Setup (9.7)
   - Production Deployment (9.12)

2. **Medium Priority** (Quality):
   - Error Classes (9.5)
   - Integration Testing (9.8)
   - Unit Tests (9.9)

3. **Low Priority** (Nice to have):
   - Monitoring & Alerts (9.10)
   - Documentation (9.11)

---

## 11. Checkpoints walidacyjne

### Po implementacji Service Layer:

- [ ] Wszystkie event handlers zaimplementowane
- [ ] Idempotency działa poprawnie (duplicate events ignored)
- [ ] Audit trail zapisywany dla każdej zmiany
- [ ] Transactions używane dla spójności danych
- [ ] Error handling pokrywa wszystkie scenariusze

### Po implementacji Endpoint:

- [ ] Signature verification działa
- [ ] Raw body przekazywany do weryfikacji
- [ ] 200 OK zwracane dla wszystkich przypadków (poza 400)
- [ ] Errors logowane szczegółowo
- [ ] Service role client używany (nie user context)

### Przed deployment:

- [ ] Local testing z Stripe CLI przeszedł pomyślnie
- [ ] Wszystkie typy eventów przetestowane
- [ ] Idempotency zweryfikowana (duplicate events)
- [ ] Database audit trail poprawny
- [ ] Error scenarios przetestowane
- [ ] Production webhook secret skonfigurowany
- [ ] Endpoint dostępny publicznie (bez auth)

### Po deployment:

- [ ] Test event z Stripe Dashboard processed successfully
- [ ] Logs pokazują prawidłowe przetwarzanie
- [ ] Database updated correctly
- [ ] Stripe Dashboard pokazuje successful deliveries
- [ ] No errors w Stripe retry logs

---

## 12. Kluczowe decyzje architektoniczne

### 12.1. Service Role vs User Auth

**Decyzja**: Użyć Supabase service_role client (bypass RLS)

**Uzasadnienie**:
- Webhooks nie mają user context (przychodzą od Stripe)
- RLS policies wymagałyby auth.uid() (którego nie ma)
- Service role pozwala na pełny dostęp do DB
- Bezpieczeństwo zapewnione przez Stripe signature verification

### 12.2. Synchroniczne vs Asynchroniczne Processing

**Decyzja**: Synchroniczne processing w MVP

**Uzasadnienie**:
- Prostsze do implementacji i debugowania
- Stripe timeout 30s wystarcza dla naszych operacji (<500ms)
- Volume webhooks w MVP niski (<100/day)
- Queue (Bull/Redis) można dodać później przy scale

**Upgrade path**: Jeśli processing >10s lub volume >1000/day:
```typescript
// Quick acknowledge + queue for processing
await webhookQueue.add('process-stripe-event', { eventId: event.id });
return { received: true, event_id: event.id, queued: true };
```

### 12.3. Always Return 200 OK

**Decyzja**: Return 200 OK nawet dla processing errors (poza signature verification)

**Uzasadnienie**:
- Stripe retry mechanism bardzo agresywny (3 dni, exponential backoff)
- Permanent errors (user not found) nie powinny być retry'owane
- Temporary errors (DB timeout) mogą być retry'owane
- Logged errors można naprawić manualnie przez admin

**Pattern**:
```typescript
try {
  // Process webhook
} catch (error) {
  console.error('Processing failed:', error);
  await logError(error);
  return 200; // Prevent Stripe retries
}
```

### 12.4. Idempotency Implementation

**Decyzja**: Database UNIQUE constraint + INSERT ON CONFLICT

**Uzasadnienie**:
- Atomowa operacja na poziomie DB
- Race condition safe (concurrent webhooks)
- Nie wymaga distributed lock (Redis)
- Prosta implementacja

**Alternative considered**: Application-level lock (rejected - complex, requires Redis)

---

**Koniec planu implementacji webhooks** 🎉

