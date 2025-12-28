# API Endpoint Implementation Plan: NocoDB Proxy - Black Swan Data (2.4) - CZĘŚĆ 2/3

## 5. Przepływ danych

### 5.1. GET /api/nocodb/grid - Główny przepływ

```
Client Request (range, symbols?, end_date?)
    ↓
[1] Extract & verify auth token → getAuthUid()
    ↓
[2] Check user subscription status
    - Query app_users for subscription_status, trial_expires_at
    - Verify: subscription_status IN ('trial', 'active') OR trial_expires_at > now()
    - If not authorized → Return 401 Unauthorized
    ↓
[3] Check rate limit
    - Get user's rate limit entry from in-memory store
    - If count >= 60 and resetAt > now() → Return 429 Too Many Requests
    - Else increment count
    ↓
[4] Validate query parameters with Zod
    - range: must be 'week' | 'month' | 'quarter'
    - symbols: optional, validate format
    - end_date: optional, validate YYYY-MM-DD format
    - If validation fails → Return 400 Bad Request
    ↓
[5] Calculate date range
    - If end_date provided, use it; else use today
    - Calculate start_date based on range:
      - week: end_date - 7 days
      - month: end_date - 30 days
      - quarter: end_date - 90 days
    ↓
[6] Parse symbols (if provided)
    - Split comma-separated string: symbols.split(',')
    - Trim whitespace: symbols.map(s => s.trim())
    ↓
[7] Build NocoDB query filters
    - occurrence_date >= start_date
    - occurrence_date <= end_date
    - If symbols provided: symbol IN (symbols)
    ↓
[8] Call NocoDB API
    - GET /api/v2/tables/{tableId}/records
    - Query params: where=(occurrence_date,gte,{start_date})~and(occurrence_date,lte,{end_date})
    - If symbols: ~and(symbol,in,{symbols})
    - Timeout: 5 seconds
    - Retry: 2 attempts with 500ms delay
    ↓
[9] Transform NocoDB response
    - Map NocoDB fields to BlackSwanEventMinimal interface
    - Check if AI summary exists for each event (has_summary flag)
    - Extract unique symbols from events
    ↓
[10] Build response object
    - range, start_date, end_date
    - events array (sorted by occurrence_date DESC)
    - symbols array (unique)
    - cached_at: current timestamp
    ↓
[11] Add rate limit headers to response
    - X-RateLimit-Limit: 60
    - X-RateLimit-Remaining: 60 - count
    - X-RateLimit-Reset: resetAt timestamp
    ↓
[12] Return 200 OK with GridResponse
    ↓
Client Response
```

**Interakcje zewnętrzne:**
- **Supabase**: Query `app_users` (subscription check)
- **NocoDB API**: GET `/api/v2/tables/{tableId}/records` z filtrami

**Performance considerations:**
- NocoDB query: ~300-800ms (depends on data size)
- Subscription check: ~50ms (indexed query)
- Total target: < 1.5s

---

### 5.2. GET /api/nocodb/events/:id - Szczegółowy event

```
Client Request (event_id)
    ↓
[1] Extract & verify auth token → getAuthUid()
    ↓
[2] Check user subscription status (same as 5.1)
    ↓
[3] Check rate limit (same as 5.1)
    ↓
[4] Validate path parameter
    - event_id must start with 'rec_'
    - If invalid → Return 400 Bad Request
    ↓
[5] Fetch event from NocoDB GPW_black_swans
    - GET /api/v2/tables/{blackSwansTableId}/records/{event_id}
    - If not found → Return 404 Not Found
    ↓
[6] Fetch first AI summary (if exists)
    - Query GPW_AI_summary table
    - WHERE symbol = event.symbol AND occurrence_date = event.occurrence_date
    - ORDER BY date DESC LIMIT 1
    ↓
[7] Fetch historic data (if exists)
    - Query GPW_historic_data table
    - WHERE symbol = event.symbol AND date = event.occurrence_date
    ↓
[8] Build detailed response
    - Combine event + summary + historic_data
    - Transform to BlackSwanEventDetailed interface
    ↓
[9] Add rate limit headers
    ↓
[10] Return 200 OK with detailed event
    ↓
Client Response
```

**Interakcje zewnętrzne:**
- **Supabase**: Query `app_users`
- **NocoDB API**: 
  - GET `/api/v2/tables/{blackSwansTableId}/records/{id}`
  - GET `/api/v2/tables/{aiSummariesTableId}/records` (filtered query)
  - GET `/api/v2/tables/{historicDataTableId}/records` (filtered query)

**Optimization:**
- Parallel fetching: Execute summary + historic_data queries concurrently
- Use Promise.all() for parallel requests

---

### 5.3. GET /api/nocodb/summaries - Wszystkie summaries

```
Client Request (symbol, occurrence_date, event_type?)
    ↓
[1] Extract & verify auth token → getAuthUid()
    ↓
[2] Check user subscription status
    ↓
[3] Check rate limit
    ↓
[4] Validate query parameters with Zod
    - symbol: 1-10 characters
    - occurrence_date: YYYY-MM-DD format
    - event_type: optional enum
    - If validation fails → Return 400 Bad Request
    ↓
[5] Build NocoDB query filters
    - symbol = symbol
    - occurrence_date = occurrence_date
    - If event_type provided: event_type = event_type
    ↓
[6] Call NocoDB API (GPW_AI_summary table)
    - GET /api/v2/tables/{aiSummariesTableId}/records
    - Query params: where=(symbol,eq,{symbol})~and(occurrence_date,eq,{date})
    - ORDER BY date DESC
    ↓
[7] Transform NocoDB response
    - Map to AISummary[] interface
    - If empty → Return 404 Not Found
    ↓
[8] Build response object
    - symbol, occurrence_date, event_type
    - summaries array (sorted by date DESC - most recent first)
    - total_summaries: summaries.length
    ↓
[9] Add rate limit headers
    ↓
[10] Return 200 OK with SummariesResponse
    ↓
Client Response
```

**Interakcje zewnętrzne:**
- **Supabase**: Query `app_users`
- **NocoDB API**: GET `/api/v2/tables/{aiSummariesTableId}/records`

---

## 6. Względy bezpieczeństwa

### 6.1. Autentykacja i Autoryzacja

**Multi-layer security:**

1. **Bearer Token Verification**
   ```typescript
   const authUid = await getAuthUid(request, supabase);
   if (!authUid) {
     return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
   }
   ```

2. **Subscription Status Check**
   ```typescript
   const user = await userService.getUserProfile(authUid);
   const hasAccess = 
     ['trial', 'active'].includes(user.subscription_status) ||
     (user.trial_expires_at && new Date(user.trial_expires_at) > new Date());
   
   if (!hasAccess) {
     return createErrorResponse('Active subscription required', 401, 'SUBSCRIPTION_REQUIRED');
   }
   ```

3. **RLS Bypass dla NocoDB**
   - NocoDB requests wykonywane z server-side (nie przez user context)
   - NocoDB API token przechowywany w environment variables
   - Nigdy nie eksponować tokena w client-side code

### 6.2. NocoDB API Token Security

**Wymagania:**

```env
# .env (NEVER commit!)
NOCODB_BASE_URL=https://nocodb.example.com
NOCODB_API_TOKEN=your_api_token_here
NOCODB_TABLE_BLACK_SWANS=tbl_xxx
NOCODB_TABLE_AI_SUMMARIES=tbl_yyy
NOCODB_TABLE_HISTORIC_DATA=tbl_zzz
```

**Best practices:**
- Token stored only server-side (Astro endpoint)
- Use separate token for each environment (dev, staging, prod)
- Rotate tokens quarterly
- Monitor token usage in NocoDB logs

### 6.3. Rate Limiting Implementation

**Purpose:**
- Prevent abuse (excessive API calls)
- Protect NocoDB from overload
- Fair usage across users

**Implementation:**

```typescript
// src/lib/rate-limiter.ts

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private limit: number = 60; // requests per window
  private windowMs: number = 60 * 1000; // 1 minute

  check(userId: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(userId);

    // No entry or expired
    if (!entry || entry.resetAt < now) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.windowMs
      };
      this.store.set(userId, newEntry);
      
      return {
        allowed: true,
        remaining: this.limit - 1,
        resetAt: newEntry.resetAt
      };
    }

    // Entry exists and not expired
    if (entry.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      };
    }

    // Increment count
    entry.count++;
    this.store.set(userId, entry);

    return {
      allowed: true,
      remaining: this.limit - entry.count,
      resetAt: entry.resetAt
    };
  }

  // Cleanup expired entries (run periodically)
  cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(userId);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
```

**Usage in endpoint:**
```typescript
const rateLimitResult = rateLimiter.check(authUid);

if (!rateLimitResult.allowed) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        details: { retry_after: rateLimitResult.retryAfter }
      }
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
        'Retry-After': rateLimitResult.retryAfter!.toString()
      }
    }
  );
}

// Add headers to successful response
headers.set('X-RateLimit-Limit', '60');
headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toString());
```

### 6.4. Input Validation & Sanitization

**Zod schemas dla każdego endpointu:**

```typescript
// src/lib/nocodb-validation.ts

import { z } from 'zod';

export const GridQuerySchema = z.object({
  range: z.enum(['week', 'month', 'quarter']),
  symbols: z.string().optional().refine(
    (val) => !val || /^[A-Z0-9,]+$/.test(val),
    { message: 'Invalid symbols format' }
  ),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const EventIdSchema = z.string().startsWith('rec_');

export const SummariesQuerySchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  occurrence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_type: z.enum([
    'BLACK_SWAN_UP',
    'BLACK_SWAN_DOWN',
    'VOLATILITY_UP',
    'VOLATILITY_DOWN',
    'BIG_MOVE'
  ]).optional()
});
```

**SQL Injection Prevention:**
- NocoDB API uses parameterized queries internally
- Never construct raw SQL queries in application
- Use NocoDB's query builder/filters

**XSS Prevention:**
- Validate all user inputs with Zod
- Sanitize symbol strings (allow only alphanumeric + comma)
- Date validation with regex (prevent injection)

### 6.5. Error Information Disclosure

**Never expose:**
- NocoDB API token
- Internal table IDs (abstract in config)
- Detailed NocoDB error messages (could reveal schema)
- Stack traces in production

**Pattern:**
```typescript
try {
  const data = await nocodbService.fetchGrid(params);
  return createSuccessResponse(data, 200);
} catch (error) {
  // Log detailed error server-side
  console.error('[NOCODB] Grid fetch error:', {
    params,
    error: error instanceof Error ? error.message : 'Unknown',
    stack: error instanceof Error ? error.stack : undefined
  });
  
  // Return generic error to client
  return createErrorResponse(
    'Failed to fetch grid data',
    500,
    'NOCODB_ERROR'
  );
}
```

---

## 7. Obsługa błędów

### 7.1. Error Hierarchy

```typescript
// src/lib/nocodb-errors.ts

export class NocoDBError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'NocoDBError';
  }
}

export class NocoDBConnectionError extends NocoDBError {
  constructor(message: string = 'Failed to connect to NocoDB') {
    super(message, 'NOCODB_CONNECTION_ERROR', 503, true);
  }
}

export class NocoDBTimeoutError extends NocoDBError {
  constructor(message: string = 'NocoDB request timeout') {
    super(message, 'NOCODB_TIMEOUT', 504, true);
  }
}

export class NocoDBNotFoundError extends NocoDBError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOCODB_NOT_FOUND', 404, false);
  }
}

export class RateLimitError extends NocoDBError {
  constructor(public retryAfter: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, false);
  }
}

export class SubscriptionRequiredError extends NocoDBError {
  constructor() {
    super('Active subscription required', 'SUBSCRIPTION_REQUIRED', 401, false);
  }
}
```

### 7.2. Scenariusze błędów

| Scenariusz | Status | Code | Retryable | Handling |
|------------|--------|------|-----------|----------|
| Brak tokena auth | 401 | UNAUTHORIZED | ❌ | Return immediately |
| Nieaktywna subskrypcja | 401 | SUBSCRIPTION_REQUIRED | ❌ | Return immediately |
| Rate limit exceeded | 429 | RATE_LIMIT_EXCEEDED | ❌ | Return with Retry-After |
| Nieprawidłowy range | 400 | VALIDATION_ERROR | ❌ | Return validation errors |
| Nieprawidłowy date format | 400 | VALIDATION_ERROR | ❌ | Return validation errors |
| NocoDB timeout | 504 | NOCODB_TIMEOUT | ✅ | Retry 2x with backoff |
| NocoDB connection error | 503 | NOCODB_CONNECTION_ERROR | ✅ | Retry 2x with backoff |
| Event not found | 404 | EVENT_NOT_FOUND | ❌ | Return 404 |
| No summaries found | 404 | SUMMARIES_NOT_FOUND | ❌ | Return 404 |
| NocoDB API error | 500 | NOCODB_ERROR | ❌ | Log + return generic error |
| Unknown error | 500 | UNKNOWN_ERROR | ❌ | Log + return generic error |

### 7.3. Retry Logic

**NocoDB request retry:**

```typescript
// src/lib/nocodb-client.ts

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`NocoDB API error: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      lastError = error as Error;

      // Don't retry on timeout or connection errors if it's the last attempt
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500; // 500ms, 1000ms
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError!;
}
```

### 7.4. Graceful Degradation

**Strategie:**

1. **Missing AI Summary**
   - Jeśli brak summary dla eventu, zwróć `summary: null`
   - Client powinien pokazać "No analysis available"

2. **Missing Historic Data**
   - Jeśli brak danych OHLC, zwróć `historic_data: null`
   - Client może ukryć chart

3. **Partial Results**
   - Jeśli niektóre requesty fail w parallel fetch, zwróć partial data
   - Log warning server-side

4. **NocoDB Downtime**
   - Return 503 Service Unavailable
   - Client może pokazać cached data (jeśli implementowany)

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

1. **NocoDB API latency**: 300-800ms per request
2. **Multiple API calls** dla event details (event + summary + historic)
3. **Large result sets** dla długich zakresów (quarter)
4. **Rate limiting overhead**: ~5ms per request (akceptowalne)

### 8.2. Strategie optymalizacji

#### 8.2.1. Parallel Fetching

```typescript
// Dla /api/nocodb/events/:id

const [event, summaries, historicData] = await Promise.all([
  nocodbClient.getEvent(eventId),
  nocodbClient.getSummaries(symbol, date).catch(() => null), // Graceful fail
  nocodbClient.getHistoricData(symbol, date).catch(() => null) // Graceful fail
]);
```

**Benefits:**
- Reduce total time from 900ms to ~400ms (3x parallel)
- Graceful degradation jeśli summary/historic fail

#### 8.2.2. Response Pagination (Future)

**Dla grid endpoint z dużymi wynikami:**

```typescript
// Query params
const GridQuerySchemaWithPagination = GridQuerySchema.extend({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(50)
});

// Response
interface GridResponsePaginated extends GridResponse {
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalEvents: number;
  };
}
```

**MVP: Skip pagination** (implement later if needed)

#### 8.2.3. Field Selection

**Fetch only required fields z NocoDB:**

```typescript
// Instead of SELECT *
const fields = [
  'id',
  'symbol',
  'occurrence_date',
  'event_type',
  'percent_change'
].join(',');

const url = `${baseUrl}/records?fields=${fields}&where=...`;
```

**Benefits:**
- Reduce payload size ~50%
- Faster JSON parsing
- Lower bandwidth

#### 8.2.4. Connection Pooling

**HTTP Agent z keep-alive:**

```typescript
// src/lib/nocodb-client.ts

import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 60000
});

// Use in fetch
fetch(url, {
  agent: httpsAgent,
  // ...other options
});
```

### 8.3. Monitoring Metrics

**Key metrics:**
- NocoDB API response time (p50, p95, p99)
- Rate limit hits per user
- Cache hit rate (jeśli caching zaimplementowany)
- Error rate by endpoint
- Payload size distribution

**Alerts:**
- NocoDB response time > 2s
- Error rate > 5% w 5 min window
- Rate limit exceeded > 10x/hour per user

---

**KONIEC CZĘŚCI 2/3**

Następna część będzie zawierać:
- Etapy wdrożenia (szczegółowe kroki)
- Checklisty walidacyjne
- Decyzje architektoniczne

