# API Endpoint Implementation Plan: NocoDB Proxy - Black Swan Data (2.4) - CZĘŚĆ 4/4 (FINALNA)

## 9.9. API Endpoints (Priorytet: Wysoki)

**Czas: 3 godziny**

### 9.9.1. GET /api/nocodb/grid

**Create `src/pages/api/nocodb/grid.ts`:**

```typescript
/**
 * GET /api/nocodb/grid
 * Fetch Black Swan events for grid view
 */
import type { APIRoute } from 'astro';
import { NocoDBService } from '@/services/nocodb.service';
import { UserService } from '@/services/user.service';
import { getAuthUid } from '@/lib/auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { GridQuerySchema, parseQueryParams } from '@/lib/nocodb-validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { SubscriptionRequiredError, RateLimitError } from '@/lib/nocodb-errors';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Authentication
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // [2] Check subscription status
    const userService = new UserService(supabase);
    const user = await userService.getUserProfile(authUid);
    
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    const hasAccess = 
      ['trial', 'active'].includes(user.subscription_status) ||
      (user.trial_expires_at && new Date(user.trial_expires_at) > new Date());

    if (!hasAccess) {
      throw new SubscriptionRequiredError();
    }

    // [3] Rate limiting
    const rateLimitResult = rateLimiter.check(authUid);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            details: { retry_after: rateLimitResult.retryAfter }
          },
          timestamp: new Date().toISOString()
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

    // [4] Validate query parameters
    const validation = parseQueryParams(url, GridQuerySchema);
    
    if (!validation.success) {
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validation.error.flatten().fieldErrors
      );
    }

    // [5] Fetch grid data
    const nocodbService = new NocoDBService();
    const gridData = await nocodbService.getGridData(validation.data);

    // [6] Return with rate limit headers
    return new Response(
      JSON.stringify({
        success: true,
        data: gridData,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString()
        }
      }
    );

  } catch (error) {
    // Handle specific errors
    if (error instanceof SubscriptionRequiredError) {
      return createErrorResponse(error.message, error.statusCode, error.code);
    }

    // Log and return generic error
    console.error('[NOCODB_GRID] Error:', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });

    return createErrorResponse(
      'Failed to fetch grid data',
      500,
      'NOCODB_ERROR'
    );
  }
};
```

### 9.9.2. GET /api/nocodb/events/[id].ts

**Create `src/pages/api/nocodb/events/[id].ts`:**

```typescript
/**
 * GET /api/nocodb/events/:id
 * Fetch single Black Swan event with details
 */
import type { APIRoute } from 'astro';
import { NocoDBService } from '@/services/nocodb.service';
import { UserService } from '@/services/user.service';
import { getAuthUid } from '@/lib/auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { EventIdSchema } from '@/lib/nocodb-validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { SubscriptionRequiredError, NocoDBNotFoundError } from '@/lib/nocodb-errors';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Authentication
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // [2] Check subscription
    const userService = new UserService(supabase);
    const user = await userService.getUserProfile(authUid);
    
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    const hasAccess = 
      ['trial', 'active'].includes(user.subscription_status) ||
      (user.trial_expires_at && new Date(user.trial_expires_at) > new Date());

    if (!hasAccess) {
      throw new SubscriptionRequiredError();
    }

    // [3] Rate limiting
    const rateLimitResult = rateLimiter.check(authUid);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            details: { retry_after: rateLimitResult.retryAfter }
          },
          timestamp: new Date().toISOString()
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

    // [4] Validate event ID
    const eventId = params.id;
    const validation = EventIdSchema.safeParse(eventId);
    
    if (!validation.success) {
      return createErrorResponse(
        'Invalid event ID format',
        400,
        'VALIDATION_ERROR',
        validation.error.flatten().formErrors
      );
    }

    // [5] Fetch event details
    const nocodbService = new NocoDBService();
    const eventDetails = await nocodbService.getEventDetails(validation.data);

    // [6] Return with rate limit headers
    return new Response(
      JSON.stringify({
        success: true,
        data: eventDetails,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString()
        }
      }
    );

  } catch (error) {
    // Handle specific errors
    if (error instanceof SubscriptionRequiredError) {
      return createErrorResponse(error.message, error.statusCode, error.code);
    }

    if (error instanceof NocoDBNotFoundError) {
      return createErrorResponse('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    // Log and return generic error
    console.error('[NOCODB_EVENT] Error:', {
      eventId: params.id,
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });

    return createErrorResponse(
      'Failed to fetch event details',
      500,
      'NOCODB_ERROR'
    );
  }
};
```

### 9.9.3. GET /api/nocodb/summaries.ts

**Create `src/pages/api/nocodb/summaries.ts`:**

```typescript
/**
 * GET /api/nocodb/summaries
 * Fetch all AI summaries for an event
 */
import type { APIRoute } from 'astro';
import { NocoDBService } from '@/services/nocodb.service';
import { UserService } from '@/services/user.service';
import { getAuthUid } from '@/lib/auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { SummariesQuerySchema, parseQueryParams } from '@/lib/nocodb-validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { SubscriptionRequiredError } from '@/lib/nocodb-errors';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Authentication
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // [2] Check subscription
    const userService = new UserService(supabase);
    const user = await userService.getUserProfile(authUid);
    
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    const hasAccess = 
      ['trial', 'active'].includes(user.subscription_status) ||
      (user.trial_expires_at && new Date(user.trial_expires_at) > new Date());

    if (!hasAccess) {
      throw new SubscriptionRequiredError();
    }

    // [3] Rate limiting
    const rateLimitResult = rateLimiter.check(authUid);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            details: { retry_after: rateLimitResult.retryAfter }
          },
          timestamp: new Date().toISOString()
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

    // [4] Validate query parameters
    const validation = parseQueryParams(url, SummariesQuerySchema);
    
    if (!validation.success) {
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validation.error.flatten().fieldErrors
      );
    }

    // [5] Fetch summaries
    const nocodbService = new NocoDBService();
    const summaries = await nocodbService.getAllSummaries(validation.data);

    // [6] Return with rate limit headers
    return new Response(
      JSON.stringify({
        success: true,
        data: summaries,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString()
        }
      }
    );

  } catch (error) {
    // Handle specific errors
    if (error instanceof SubscriptionRequiredError) {
      return createErrorResponse(error.message, error.statusCode, error.code);
    }

    if (error.message === 'No summaries found') {
      return createErrorResponse('No summaries found', 404, 'SUMMARIES_NOT_FOUND');
    }

    // Log and return generic error
    console.error('[NOCODB_SUMMARIES] Error:', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });

    return createErrorResponse(
      'Failed to fetch summaries',
      500,
      'NOCODB_ERROR'
    );
  }
};
```

---

## 9.10. Testing (Priorytet: Średni)

**Czas: 3 godziny**

### Manual Testing

1. **Test GET /api/nocodb/grid**
   ```bash
   # Week range
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/nocodb/grid?range=week"
   
   # With symbols filter
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/nocodb/grid?range=month&symbols=CPD,PKN"
   
   # With end_date
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/nocodb/grid?range=quarter&end_date=2025-12-25"
   ```

2. **Test GET /api/nocodb/events/:id**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/nocodb/events/rec_abc123"
   ```

3. **Test GET /api/nocodb/summaries**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/nocodb/summaries?symbol=CPD&occurrence_date=2025-12-24"
   ```

4. **Test rate limiting**
   ```bash
   # Send 65 requests in < 1 minute (should get 429 after 60)
   for i in {1..65}; do
     curl -H "Authorization: Bearer YOUR_TOKEN" \
       "http://localhost:4321/api/nocodb/grid?range=week"
     echo "Request $i"
   done
   ```

---

## 10. Podsumowanie implementacji

### Pliki do utworzenia:

1. `src/types/nocodb.types.ts` - Type definitions
2. `src/types/rate-limit.types.ts` - Rate limit types
3. `src/config/nocodb.config.ts` - Configuration
4. `src/lib/rate-limiter.ts` - Rate limiting logic
5. `src/lib/nocodb-validation.ts` - Zod schemas
6. `src/lib/nocodb-client.ts` - NocoDB API client
7. `src/lib/nocodb-errors.ts` - Custom errors
8. `src/services/nocodb.service.ts` - Business logic
9. `src/pages/api/nocodb/grid.ts` - Grid endpoint
10. `src/pages/api/nocodb/events/[id].ts` - Event details endpoint
11. `src/pages/api/nocodb/summaries.ts` - Summaries endpoint

### Environment Variables:

```env
NOCODB_BASE_URL=https://nocodb.example.com
NOCODB_API_TOKEN=your_token
NOCODB_TABLE_BLACK_SWANS=tbl_xxx
NOCODB_TABLE_AI_SUMMARIES=tbl_yyy
NOCODB_TABLE_HISTORIC_DATA=tbl_zzz
```

### Dependencies:

- `zod` (już zainstalowane)
- Brak nowych dependencies!

### Szacowany czas implementacji: 12-14 godzin

---

## 11. Checkpoints walidacyjne

### Po implementacji Rate Limiter:

- [ ] Rate limiter ogranicza do 60 req/min
- [ ] Cleanup działa poprawnie
- [ ] Headers X-RateLimit-* są zwracane
- [ ] 429 response z Retry-After działa

### Po implementacji NocoDB Client:

- [ ] Fetch z retry działa (testować z timeout)
- [ ] Filters są poprawnie budowane
- [ ] Parallel fetching działa dla event details
- [ ] Graceful degradation dla optional data

### Po implementacji Endpoints:

- [ ] Subscription check działa poprawnie
- [ ] Validation zwraca prawidłowe błędy
- [ ] Rate limiting jest enforced
- [ ] Response format zgodny ze specyfikacją
- [ ] Error handling pokrywa wszystkie scenariusze

### Przed deployment:

- [ ] NocoDB credentials skonfigurowane
- [ ] Table IDs poprawne dla wszystkich tabel
- [ ] Rate limiter cleanup scheduled
- [ ] Manual testing passed dla wszystkich endpoints
- [ ] Error scenarios przetestowane
- [ ] Performance < 1.5s dla grid endpoint

---

## 12. Kluczowe decyzje architektoniczne

### 12.1. In-Memory Rate Limiting

**Decyzja**: Użyć in-memory Map zamiast Redis

**Uzasadnienie**:
- MVP nie wymaga distributed rate limiting
- Prostsze w implementacji i maintenance
- Zero external dependencies
- Wystarczające dla single-instance deployment

**Upgrade path**: W przypadku horizontal scaling użyć Redis
```typescript
import { createClient } from 'redis';
// Implement distributed rate limiter
```

### 12.2. Proxy Pattern vs Data Replication

**Decyzja**: Proxy pattern (nie kopiujemy danych do Supabase)

**Uzasadnienie**:
- NocoDB jest source of truth dla Black Swan data
- Eliminuje data synchronization complexity
- Mniejsze koszty storage
- Łatwiejsze updates (dane aktualizowane w jednym miejscu)

**Trade-offs**:
- Zależność od NocoDB uptime
- Nieco wyższa latency (network hop)
- Brak offline access

### 12.3. Parallel Fetching dla Event Details

**Decyzja**: Fetch event + summary + historic_data równolegle

**Uzasadnienie**:
```typescript
// Sequential: 300ms + 200ms + 150ms = 650ms
// Parallel: max(300ms, 200ms, 150ms) = 300ms
```

**Benefits**:
- ~50% redukcja latency
- Better user experience
- Graceful degradation (jeśli summary/historic fail)

### 12.4. Rate Limit Headers

**Decyzja**: Zawsze zwracać X-RateLimit-* headers

**Uzasadnienie**:
- Transparentność dla klientów
- Możliwość implementacji client-side backoff
- Zgodność z industry standards (GitHub, Stripe)

---

**KONIEC PLANU IMPLEMENTACJI** 🎉

Plan jest kompletny i gotowy do użycia przez zespół deweloperski! 🚀

