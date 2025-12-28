# API Endpoint Implementation Plan: Subscription Management (2.2)

## 1. Przegląd punktu końcowego

Moduł **Subscription Management** zarządza cyklem życia subskrypcji użytkowników poprzez integrację ze Stripe. Składa się z trzech endpointów:

1. **GET /api/subscriptions/status** - Zwraca aktualny status subskrypcji użytkownika, trial period i dostęp do aplikacji
2. **POST /api/subscriptions/create-checkout** - Tworzy sesję Stripe Checkout dla nowej subskrypcji
3. **POST /api/subscriptions/create-portal** - Generuje link do Stripe Customer Portal dla zarządzania subskrypcją

Wszystkie endpointy wymagają autentykacji i pracują w kontekście zalogowanego użytkownika.

---

## 2. Szczegóły żądań

### 2.1. GET /api/subscriptions/status

**Metoda HTTP:** GET  
**Struktura URL:** `/api/subscriptions/status`  
**Autentykacja:** Required (Bearer token z Supabase Auth)

**Parametry:**
- Wymagane: Brak
- Opcjonalne: Brak
- Headers: `Authorization: Bearer <token>`

**Request Body:** Brak (GET request)

---

### 2.2. POST /api/subscriptions/create-checkout

**Metoda HTTP:** POST  
**Struktura URL:** `/api/subscriptions/create-checkout`  
**Autentykacja:** Required (Bearer token z Supabase Auth)

**Parametry:**
- Wymagane:
  - `price_id` (string) - Stripe Price ID (format: `price_*`)
  - `success_url` (string) - URL przekierowania po sukcesie (musi być z whitelisty domen)
  - `cancel_url` (string) - URL przekierowania po anulowaniu (musi być z whitelisty domen)
- Opcjonalne: Brak

**Request Body:**
```json
{
  "price_id": "price_1ABC123xyz",
  "success_url": "https://app.example.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://app.example.com/cancel"
}
```

**Walidacja (Zod Schema):**
```typescript
const CreateCheckoutSchema = z.object({
  price_id: z.string().startsWith('price_', 'Invalid Stripe price ID format'),
  success_url: z.string().url('Invalid success_url format'),
  cancel_url: z.string().url('Invalid cancel_url format')
});
```

---

### 2.3. POST /api/subscriptions/create-portal

**Metoda HTTP:** POST  
**Struktura URL:** `/api/subscriptions/create-portal`  
**Autentykacja:** Required (Bearer token z Supabase Auth)

**Parametry:**
- Wymagane:
  - `return_url` (string) - URL powrotu z portalu (musi być z whitelisty domen)
- Opcjonalne: Brak

**Request Body:**
```json
{
  "return_url": "https://app.example.com/account"
}
```

**Walidacja (Zod Schema):**
```typescript
const CreatePortalSchema = z.object({
  return_url: z.string().url('Invalid return_url format')
});
```

---

## 3. Wykorzystywane typy

### 3.1. Request DTOs

```typescript
// src/types/subscription.types.ts

export interface CreateCheckoutDTO {
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CreatePortalDTO {
  return_url: string;
}
```

### 3.2. Response DTOs

```typescript
// src/types/subscription.types.ts

export interface SubscriptionStatusDTO {
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  trial_expires_at: string | null;
  current_period_end: string | null;
  plan_id: string | null;
  stripe_subscription_id: string | null;
  has_access: boolean;
}

export interface CheckoutSessionDTO {
  checkout_url: string;
  session_id: string;
}

export interface PortalSessionDTO {
  portal_url: string;
}
```

### 3.3. Service Types

```typescript
// src/services/subscription.service.ts

export interface StripeCustomerCreateParams {
  auth_uid: string;
  email: string;
}

export interface CheckoutSessionParams {
  customer_id: string;
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface PortalSessionParams {
  customer_id: string;
  return_url: string;
}
```

### 3.4. Database Types

Wykorzystuje istniejące typy z `database.types.ts`:
- `Database['public']['Tables']['app_users']['Row']`
- `Database['public']['Tables']['app_users']['Update']`

---

## 4. Szczegóły odpowiedzi

### 4.1. GET /api/subscriptions/status

**Sukces (200 OK):**
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

**Błędy:**
- `401 Unauthorized`: Brak lub nieprawidłowy token
  ```json
  {
    "success": false,
    "error": {
      "message": "Unauthorized",
      "code": "UNAUTHORIZED"
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```

---

### 4.2. POST /api/subscriptions/create-checkout

**Sukces (200 OK):**
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

**Błędy:**
- `400 Bad Request`: Nieprawidłowy price_id lub URL
  ```json
  {
    "success": false,
    "error": {
      "message": "Invalid price_id format",
      "code": "VALIDATION_ERROR",
      "details": {
        "price_id": "Must start with 'price_'"
      }
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```

- `401 Unauthorized`: Brak autentykacji

- `500 Internal Server Error`: Błąd Stripe API
  ```json
  {
    "success": false,
    "error": {
      "message": "Failed to create checkout session",
      "code": "STRIPE_ERROR",
      "details": "No such price: 'price_invalid'"
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```

---

### 4.3. POST /api/subscriptions/create-portal

**Sukces (200 OK):**
```json
{
  "success": true,
  "data": {
    "portal_url": "https://billing.stripe.com/p/session/test_abc123xyz"
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Błędy:**
- `400 Bad Request`: Nieprawidłowy return_url
- `401 Unauthorized`: Brak autentykacji
- `404 Not Found`: Brak Stripe customer
  ```json
  {
    "success": false,
    "error": {
      "message": "No subscription found",
      "code": "NO_CUSTOMER"
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```
- `500 Internal Server Error`: Błąd Stripe API

---

## 5. Przepływ danych

### 5.1. GET /api/subscriptions/status

```
Client Request
    ↓
[1] Extract & verify auth token → getAuthUid()
    ↓
[2] Fetch user from app_users (auth_uid, subscription_status, trial_expires_at, etc.)
    ↓
[3] Calculate has_access:
    - subscription_status IN ('trial', 'active') OR
    - (trial_expires_at IS NOT NULL AND trial_expires_at > now())
    ↓
[4] Return SubscriptionStatusDTO
    ↓
Client Response (200 OK)
```

**Interakcje:**
- **Supabase**: Query `app_users` table
- **Brak wywołań zewnętrznych API**

---

### 5.2. POST /api/subscriptions/create-checkout

```
Client Request (price_id, success_url, cancel_url)
    ↓
[1] Extract & verify auth token → getAuthUid()
    ↓
[2] Validate request body with Zod schema
    ↓
[3] Validate URLs against whitelist domains
    ↓
[4] Fetch user from app_users
    ↓
[5] Check if stripe_customer_id exists
    ├─ NO → [6a] Create Stripe Customer
    │         - Call stripe.customers.create()
    │         - Update app_users.stripe_customer_id
    │         - Log to subscription_audit
    │
    └─ YES → [6b] Use existing customer_id
    ↓
[7] Create Stripe Checkout Session
    - stripe.checkout.sessions.create({
        customer: customer_id,
        line_items: [{ price: price_id, quantity: 1 }],
        mode: 'subscription',
        success_url: success_url,
        cancel_url: cancel_url
      })
    ↓
[8] Return CheckoutSessionDTO (checkout_url, session_id)
    ↓
Client Response (200 OK)
```

**Interakcje:**
- **Supabase**: Query + Update `app_users`, Insert `subscription_audit`
- **Stripe API**: `customers.create()`, `checkout.sessions.create()`

---

### 5.3. POST /api/subscriptions/create-portal

```
Client Request (return_url)
    ↓
[1] Extract & verify auth token → getAuthUid()
    ↓
[2] Validate request body with Zod schema
    ↓
[3] Validate return_url against whitelist domains
    ↓
[4] Fetch user from app_users
    ↓
[5] Check if stripe_customer_id exists
    ├─ NO → Return 404 (No subscription found)
    │
    └─ YES → [6] Create Stripe Portal Session
              - stripe.billingPortal.sessions.create({
                  customer: stripe_customer_id,
                  return_url: return_url
                })
    ↓
[7] Return PortalSessionDTO (portal_url)
    ↓
Client Response (200 OK)
```

**Interakcje:**
- **Supabase**: Query `app_users`
- **Stripe API**: `billingPortal.sessions.create()`

---

## 6. Względy bezpieczeństwa

### 6.1. Autentykacja i Autoryzacja

- **Wymagana autentykacja**: Wszystkie endpointy wymagają Bearer token z Supabase Auth
- **Weryfikacja tokena**: `getAuthUid()` ekstrahuje i weryfikuje token poprzez `supabase.auth.getUser(token)`
- **Self-service only**: Użytkownik może zarządzać tylko swoją subskrypcją (auth_uid z tokena)
- **RLS Policies**: Row Level Security na `app_users` zapewnia dostęp tylko do własnych danych

### 6.2. Walidacja danych wejściowych

- **Zod validation**: Wszystkie request body walidowane przed przetworzeniem
- **Stripe ID format**: `price_id` musi zaczynać się od `price_`
- **URL whitelist**: Dozwolone tylko domeny z konfiguracji (np. `https://app.example.com`)
  ```typescript
  const ALLOWED_DOMAINS = [
    'https://app.blackswangrid.com',
    'http://localhost:4321' // tylko dev
  ];
  
  function isAllowedUrl(url: string): boolean {
    return ALLOWED_DOMAINS.some(domain => url.startsWith(domain));
  }
  ```

### 6.3. Ochrona przed atakami

- **Rate Limiting**: Ograniczenie requestów (implementacja w middleware):
  - `/create-checkout`: max 10 req/min per user
  - `/create-portal`: max 20 req/min per user
- **XSS Protection**: Sanityzacja URL parametrów (walidacja protokołu https://)
- **CSRF Protection**: Wykorzystanie Stripe session_id jako token weryfikacyjny
- **Secrets Management**: 
  - `STRIPE_SECRET_KEY` tylko po stronie serwera (nigdy w client-side code)
  - Używać `import.meta.env.STRIPE_SECRET_KEY` w Astro endpoints

### 6.4. Stripe Security Best Practices

- **Webhook verification**: Verify Stripe signatures (webhook endpoint, nie tu)
- **Idempotency**: Stripe automatycznie obsługuje idempotent requests
- **Customer verification**: Sprawdzić czy `stripe_customer_id` należy do `auth_uid`
- **Error masking**: Nie ujawniać szczegółów błędów Stripe w response (logować tylko po stronie serwera)

---

## 7. Obsługa błędów

### 7.1. Hierarchia błędów

```typescript
// src/lib/errors.ts

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

// Konkretne typy błędów
export class ValidationError extends SubscriptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class StripeError extends SubscriptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'STRIPE_ERROR', 500, details);
  }
}

export class NoCustomerError extends SubscriptionError {
  constructor() {
    super('No subscription found', 'NO_CUSTOMER', 404);
  }
}
```

### 7.2. Scenariusze błędów i kody statusu

| Scenariusz | Status Code | Error Code | Handling |
|------------|-------------|------------|----------|
| Brak tokena autoryzacji | 401 | UNAUTHORIZED | Return immediately |
| Nieprawidłowy token | 401 | UNAUTHORIZED | Return immediately |
| Nieprawidłowy price_id format | 400 | VALIDATION_ERROR | Zod validation catch |
| Nieprawidłowy URL format | 400 | VALIDATION_ERROR | Zod validation catch |
| URL spoza whitelisty | 400 | INVALID_URL | Custom validation |
| Użytkownik nie znaleziony | 404 | USER_NOT_FOUND | After DB query |
| Brak Stripe customer (portal) | 404 | NO_CUSTOMER | Before portal creation |
| Nieprawidłowy price_id (Stripe) | 500 | STRIPE_ERROR | Catch Stripe exception |
| Błąd Stripe API | 500 | STRIPE_ERROR | Catch Stripe exception |
| Błąd bazy danych | 500 | DATABASE_ERROR | Catch Supabase error |
| Nieznany błąd | 500 | UNKNOWN_ERROR | Catch-all handler |

### 7.3. Error Handling Pattern

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Authentication
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    // [2] Parse & Validate
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON", 400, "INVALID_JSON");
    }

    const validation = CreateCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        validation.error.flatten()
      );
    }

    // [3] Business logic (może rzucić SubscriptionError)
    const result = await subscriptionService.createCheckout(authUid, validation.data);
    
    return createSuccessResponse(result, 200);

  } catch (error) {
    // [4] Error handling
    if (error instanceof SubscriptionError) {
      return createErrorResponse(error.message, error.statusCode, error.code, error.details);
    }

    console.error('Unexpected error:', error);
    return createErrorResponse("An unexpected error occurred", 500, "UNKNOWN_ERROR");
  }
};
```

### 7.4. Logging Strategy

- **Console.error**: Wszystkie błędy logować z pełnym stack trace
- **Sensitive data**: Nie logować tokenów, customer IDs w plain text
- **Stripe errors**: Logować request_id z Stripe dla debugging
- **Audit trail**: Krytyczne operacje (utworzenie customer) zapisać do `subscription_audit`

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

1. **Stripe API latency**
   - Wywołania do Stripe API mogą trwać 200-500ms
   - Timeout: ustawić 10s dla Stripe requests

2. **Database queries**
   - Query `app_users` dla każdego requestu
   - Indeks na `auth_uid` (PRIMARY KEY) - szybkie

3. **Rate limiting overhead**
   - Middleware rate limiting może dodać 5-10ms
   - W MVP akceptowalne

### 8.2. Strategie optymalizacji

#### 8.2.1. Caching

```typescript
// Cache subscription status na 60 sekund (opcjonalnie dla GET /status)
const CACHE_TTL = 60; // seconds

// Nie cachować create-checkout/portal (zawsze świeże URLe)
```

#### 8.2.2. Database Optimization

- **Indeksy**: `idx_app_users_stripe_customer_id` już istnieje (z db-plan.md)
- **Select specific fields**: Nie używać `SELECT *`, tylko potrzebne kolumny
  ```typescript
  .select('auth_uid, subscription_status, trial_expires_at, current_period_end, plan_id, stripe_subscription_id, stripe_customer_id')
  ```

#### 8.2.3. Stripe API Optimization

- **Reuse connections**: Stripe SDK automatycznie zarządza connection pooling
- **Batch operations**: Nie dotyczy (pojedyncze operacje per request)
- **Async processing**: Checkout session creation jest szybka (<500ms), nie wymaga queue

#### 8.2.4. Error Recovery

- **Retry logic**: Stripe SDK ma wbudowane retry dla transient errors
- **Idempotency**: Stripe API jest idempotent, bezpieczne retry
- **Circuit breaker**: W MVP nie wymagane (małe volume)

### 8.3. Monitoring

- **Metrics do śledzenia**:
  - Liczba utworzonych checkout sessions per day
  - Średni czas odpowiedzi Stripe API
  - Rate limit hits
  - Error rate per endpoint

- **Alerty**:
  - Error rate > 5% w 5 min
  - Stripe API latency > 2s
  - Rate limit exceeded > 10x/hour per user

---

## 9. Etapy wdrożenia

### 9.1. Setup i Dependencies (Priorytet: Wysoki)

**Czas: 30 min**

1. **Zainstaluj Stripe SDK**
   ```bash
   npm install stripe
   npm install -D @types/stripe
   ```

2. **Zainstaluj Zod** (jeśli nie ma)
   ```bash
   npm install zod
   ```

3. **Dodaj zmienne środowiskowe** (`.env`)
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Utwórz whitelist domen** (`src/config/allowed-domains.ts`)
   ```typescript
   export const ALLOWED_DOMAINS = 
     import.meta.env.MODE === 'production'
       ? ['https://app.blackswangrid.com']
       : ['http://localhost:4321', 'http://localhost:3000'];
   ```

---

### 9.2. Type Definitions (Priorytet: Wysoki)

**Czas: 20 min**

1. **Utwórz `src/types/subscription.types.ts`**
   - Dodaj wszystkie DTO z sekcji 3 (Request/Response DTOs)
   - Export interfaces dla serwisów

2. **Rozszerz `src/types/types.ts`**
   - Dodaj `SubscriptionStatus` type guard
   - Dodaj helper type `HasAccess`

---

### 9.3. Validation Layer (Priorytet: Wysoki)

**Czas: 30 min**

1. **Utwórz `src/lib/subscription-validation.ts`**
   ```typescript
   import { z } from 'zod';
   
   export const CreateCheckoutSchema = z.object({
     price_id: z.string().startsWith('price_'),
     success_url: z.string().url(),
     cancel_url: z.string().url()
   });
   
   export const CreatePortalSchema = z.object({
     return_url: z.string().url()
   });
   
   export function isAllowedUrl(url: string): boolean {
     // Implementation z sekcji 6.2
   }
   ```

2. **Dodaj unit testy dla validation** (opcjonalnie)
   - Test `isAllowedUrl()` z różnymi domenami
   - Test Zod schemas

---

### 9.4. Stripe Client Setup (Priorytet: Wysoki)

**Czas: 15 min**

1. **Utwórz `src/lib/stripe.ts`**
   ```typescript
   import Stripe from 'stripe';
   
   const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
   
   if (!stripeSecretKey) {
     throw new Error('Missing STRIPE_SECRET_KEY environment variable');
   }
   
   export const stripe = new Stripe(stripeSecretKey, {
     apiVersion: '2024-12-18.acacia', // Latest version
     typescript: true,
     timeout: 10000, // 10 seconds
   });
   ```

---

### 9.5. Subscription Service (Priorytet: Wysoki)

**Czas: 2 godziny**

1. **Utwórz `src/services/subscription.service.ts`**

   **Metody do implementacji:**
   
   a. `getSubscriptionStatus(authUid: string): Promise<SubscriptionStatusDTO>`
   ```typescript
   async getSubscriptionStatus(authUid: string) {
     const { data } = await this.supabase
       .from('app_users')
       .select('subscription_status, trial_expires_at, current_period_end, plan_id, stripe_subscription_id')
       .eq('auth_uid', authUid)
       .is('deleted_at', null)
       .single();
     
     if (!data) throw new Error('User not found');
     
     const has_access = this.calculateAccess(data);
     
     return { ...data, has_access };
   }
   ```
   
   b. `calculateAccess(user: AppUser): boolean`
   ```typescript
   private calculateAccess(user: AppUser): boolean {
     const now = new Date();
     const trialValid = user.trial_expires_at && new Date(user.trial_expires_at) > now;
     const statusActive = ['trial', 'active'].includes(user.subscription_status);
     
     return statusActive || !!trialValid;
   }
   ```
   
   c. `createOrGetStripeCustomer(authUid: string): Promise<string>`
   ```typescript
   async createOrGetStripeCustomer(authUid: string) {
     const user = await this.getUserProfile(authUid);
     
     if (user.stripe_customer_id) {
       return user.stripe_customer_id;
     }
     
     // Get email from Supabase Auth
     const { data: authUser } = await this.supabase.auth.admin.getUserById(authUid);
     
     const customer = await stripe.customers.create({
       email: authUser?.user?.email,
       metadata: { auth_uid: authUid }
     });
     
     // Update app_users
     await this.supabase
       .from('app_users')
       .update({ stripe_customer_id: customer.id })
       .eq('auth_uid', authUid);
     
     // Audit log
     await this.auditService.logChange({
       user_id: authUid,
       change_type: 'stripe_customer_created',
       current: { stripe_customer_id: customer.id }
     });
     
     return customer.id;
   }
   ```
   
   d. `createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionDTO>`
   ```typescript
   async createCheckoutSession(params: CheckoutSessionParams) {
     const session = await stripe.checkout.sessions.create({
       customer: params.customer_id,
       line_items: [{ price: params.price_id, quantity: 1 }],
       mode: 'subscription',
       success_url: params.success_url,
       cancel_url: params.cancel_url,
       allow_promotion_codes: true,
       billing_address_collection: 'auto',
       metadata: {
         customer_id: params.customer_id
       }
     });
     
     return {
       checkout_url: session.url!,
       session_id: session.id
     };
   }
   ```
   
   e. `createPortalSession(params: PortalSessionParams): Promise<PortalSessionDTO>`
   ```typescript
   async createPortalSession(params: PortalSessionParams) {
     const session = await stripe.billingPortal.sessions.create({
       customer: params.customer_id,
       return_url: params.return_url
     });
     
     return {
       portal_url: session.url
     };
   }
   ```

2. **Dodaj error handling w każdej metodzie**
   - Wrap Stripe calls w try-catch
   - Rzuć `StripeError` dla błędów Stripe API
   - Loguj szczegóły błędów

---

### 9.6. API Endpoints (Priorytet: Wysoki)

**Czas: 2 godziny**

1. **Utwórz `src/pages/api/subscriptions/status.ts`**
   - Implementuj GET handler
   - Pattern: auth → service call → response
   - Error handling (401, 404, 500)

2. **Utwórz `src/pages/api/subscriptions/create-checkout.ts`**
   - Implementuj POST handler
   - Validation → URL whitelist check → service call
   - Error handling (400, 401, 500)

3. **Utwórz `src/pages/api/subscriptions/create-portal.ts`**
   - Implementuj POST handler
   - Validation → check customer exists → service call
   - Error handling (400, 401, 404, 500)

**Struktura dla każdego endpointu:**
```typescript
import type { APIRoute } from 'astro';
import { SubscriptionService } from '@/services/subscription.service';
import { getAuthUid } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

export const prerender = false;

export const [METHOD]: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;
  
  try {
    // 1. Auth
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    
    // 2. Validation (POST only)
    // ...
    
    // 3. Business logic
    const service = new SubscriptionService(supabase);
    const result = await service.[method](authUid, ...);
    
    // 4. Response
    return createSuccessResponse(result, 200);
    
  } catch (error) {
    // Error handling
  }
};
```

---

### 9.7. Error Classes (Priorytet: Średni)

**Czas: 30 min**

1. **Utwórz `src/lib/errors.ts`**
   - Implementuj `SubscriptionError` base class
   - Implementuj konkretne error classes (sekcja 7.1)

2. **Zintegruj z API endpoints**
   - Catch `SubscriptionError` w endpoint handlers
   - Map do odpowiednich HTTP responses

---

### 9.8. Unit Tests (Priorytet: Średni)

**Czas: 3 godziny**

1. **Setup test environment**
   ```bash
   npm install -D vitest @vitest/ui
   npm install -D @supabase/supabase-js
   ```

2. **Test `subscription.service.ts`**
   - Mock Stripe SDK
   - Mock Supabase client
   - Test każdą metodę service (success + error cases)

3. **Test API endpoints** (integration tests)
   - Mock locals.supabase
   - Test auth flow
   - Test validation errors
   - Test success responses

4. **Test validation helpers**
   - Test `isAllowedUrl()`
   - Test Zod schemas

**Przykład testu:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  it('should calculate access correctly for trial user', () => {
    const service = new SubscriptionService(mockSupabase);
    const user = {
      subscription_status: 'trial',
      trial_expires_at: new Date(Date.now() + 86400000).toISOString()
    };
    
    expect(service['calculateAccess'](user)).toBe(true);
  });
  
  // More tests...
});
```

---

### 9.9. Integration Testing (Priorytet: Niski)

**Czas: 2 godziny**

1. **Setup Stripe Test Mode**
   - Użyj `sk_test_*` keys
   - Utwórz test price IDs w Stripe Dashboard

2. **Manual E2E testing**
   - Test pełnego flow: GET status → POST create-checkout → redirect → webhook → GET status
   - Test error scenarios (invalid URLs, expired tokens)
   - Test z różnymi subscription statuses

3. **Dokumentacja testów**
   - Utwórz `docs/testing/subscription-flow.md`
   - Opisz test scenarios i expected results

---

### 9.10. Documentation (Priorytet: Niski)

**Czas: 1 godzina**

1. **API Documentation**
   - Dodaj OpenAPI/Swagger spec (opcjonalnie)
   - Zaktualizuj README.md z przykładami użycia

2. **Code Documentation**
   - JSDoc comments dla wszystkich public methods
   - Inline comments dla skomplikowanej logiki

3. **Deployment Guide**
   - Instrukcje setup Stripe webhooks
   - Konfiguracja environment variables w production

---

### 9.11. Security Audit (Priorytet: Średni)

**Czas: 1 godzina**

1. **Checklist:**
   - [ ] STRIPE_SECRET_KEY nigdy nie jest eksponowany w client-side code
   - [ ] URL whitelist jest prawidłowo zaimplementowany
   - [ ] Rate limiting jest aktywny dla create-checkout
   - [ ] Wszystkie endpointy wymagają autentykacji
   - [ ] Error messages nie ujawniają wrażliwych danych
   - [ ] Stripe customer verification działa poprawnie

2. **Penetration testing:**
   - Spróbuj utworzyć checkout session z cudzym auth_uid (should fail)
   - Spróbuj użyć URL spoza whitelisty (should fail)
   - Spróbuj rate limit bypass (should fail)

---

### 9.12. Deployment (Priorytet: Wysoki)

**Czas: 1 godzina**

1. **Environment variables w production:**
   ```bash
   # DigitalOcean App Platform / Docker
   STRIPE_SECRET_KEY=sk_live_...
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Stripe Dashboard configuration:**
   - Utwórz production products & prices
   - Configure billing portal settings
   - Setup webhook endpoint (osobny ticket: 2.3)

3. **Deploy:**
   - Merge do main branch
   - GitHub Actions trigger build
   - Deploy na DigitalOcean

4. **Post-deploy verification:**
   - Test GET /api/subscriptions/status (200 OK)
   - Test POST /api/subscriptions/create-checkout (200 OK + valid URL)
   - Monitor logs dla błędów

---

## 10. Podsumowanie implementacji

### Pliki do utworzenia:

1. `src/types/subscription.types.ts` - Type definitions
2. `src/lib/subscription-validation.ts` - Zod schemas + URL validation
3. `src/lib/stripe.ts` - Stripe client setup
4. `src/lib/errors.ts` - Custom error classes
5. `src/config/allowed-domains.ts` - Whitelist konfiguracja
6. `src/services/subscription.service.ts` - Business logic
7. `src/pages/api/subscriptions/status.ts` - GET endpoint
8. `src/pages/api/subscriptions/create-checkout.ts` - POST endpoint
9. `src/pages/api/subscriptions/create-portal.ts` - POST endpoint

### Pliki do modyfikacji:

1. `.env` - Dodać Stripe keys
2. `package.json` - Dodać Stripe dependency
3. `src/middleware/index.ts` - Opcjonalnie dodać rate limiting

### Dependencies:

- `stripe` (^17.4.0)
- `zod` (^3.22.0)

### Szacowany czas implementacji: 12-14 godzin

### Kolejność priorytetów:

1. **High Priority** (Core functionality):
   - Setup & Dependencies (9.1)
   - Type Definitions (9.2)
   - Validation Layer (9.3)
   - Stripe Client Setup (9.4)
   - Subscription Service (9.5)
   - API Endpoints (9.6)
   - Deployment (9.12)

2. **Medium Priority** (Quality & Security):
   - Error Classes (9.7)
   - Unit Tests (9.8)
   - Security Audit (9.11)

3. **Low Priority** (Nice to have):
   - Integration Testing (9.9)
   - Documentation (9.10)

---

## 11. Checkpoints walidacyjne

### Po implementacji każdego endpointu:

- [ ] Endpoint odpowiada zgodnie ze specyfikacją (status codes, response format)
- [ ] Walidacja requestu działa poprawnie
- [ ] Autentykacja jest wymagana i weryfikowana
- [ ] Error handling pokrywa wszystkie scenariusze
- [ ] Logi nie zawierają wrażliwych danych
- [ ] Manual test z Postman/curl przechodzi

### Przed deployment:

- [ ] Wszystkie testy jednostkowe przechodzą (90%+ coverage)
- [ ] Security audit zakończony pozytywnie
- [ ] Environment variables skonfigurowane w production
- [ ] Stripe Dashboard skonfigurowany (products, prices, portal)
- [ ] Rate limiting przetestowany i aktywny
- [ ] Error monitoring setup (Sentry/LogRocket opcjonalnie)

---

**Koniec planu implementacji** 🚀

