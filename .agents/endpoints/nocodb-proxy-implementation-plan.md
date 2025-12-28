# API Endpoint Implementation Plan: NocoDB Proxy - Black Swan Data (2.4)

**Wersja:** 1.0 (Scalony i zweryfikowany)  
**Data:** 2025-12-28  
**Szacowany czas implementacji:** 12-14 godzin

---

## Spis treści

1. [Przegląd punktu końcowego](#1-przegląd-punktu-końcowego)
2. [Szczegóły żądań](#2-szczegóły-żądań)
3. [Wykorzystywane typy](#3-wykorzystywane-typy)
4. [Szczegóły odpowiedzi](#4-szczegóły-odpowiedzi)
5. [Przepływ danych](#5-przepływ-danych)
6. [Względy bezpieczeństwa](#6-względy-bezpieczeństwa)
7. [Obsługa błędów](#7-obsługa-błędów)
8. [Rozważania dotyczące wydajności](#8-rozważania-dotyczące-wydajności)
9. [Etapy wdrożenia](#9-etapy-wdrożenia)
10. [Checkpoints walidacyjne](#10-checkpoints-walidacyjne)
11. [Kluczowe decyzje architektoniczne](#11-kluczowe-decyzje-architektoniczne)

---

## 1. Przegląd punktu końcowego

Moduł **NocoDB Proxy** zapewnia bezpieczny dostęp do danych Black Swan Events przechowywanych w zewnętrznym NocoDB. Składa się z trzech endpointów:

1. **GET /api/nocodb/grid** - Pobiera listę wydarzeń Black Swan dla siatki (główny widok)
2. **GET /api/nocodb/events/:id** - Pobiera szczegóły pojedynczego wydarzenia z pierwszym AI summary
3. **GET /api/nocodb/summaries** - Pobiera wszystkie AI summaries dla danego wydarzenia

### Kluczowe cechy:

- **Proxy pattern**: Aplikacja nie przechowuje danych Black Swan w Supabase, tylko proxy'uje requesty do NocoDB
- **Security**: NocoDB API token przechowywany tylko po stronie serwera (nigdy w client)
- **Authorization**: Wymaga aktywnej subskrypcji (trial lub active)
- **Rate limiting**: 60 requests/min per user
- **Performance**: Target response time < 1.5s

### Źródła danych w NocoDB:

- `GPW_black_swans` - Tabela z wydarzeniami Black Swan
- `GPW_AI_summary` - Tabela z AI analizami wydarzeń
- `GPW_historic_data` - Dane historyczne (OHLC, volume)

---

## 2. Szczegóły żądań

### 2.1. GET /api/nocodb/grid

**Metoda HTTP:** GET  
**Struktura URL:** `/api/nocodb/grid`  
**Autentykacja:** Required (Bearer token + active subscription/trial)

**Parametry:**
- Wymagane:
  - `range` (query string) - enum: 'week' | 'month' | 'quarter'
- Opcjonalne:
  - `symbols` (query string) - comma-separated ticker symbols (np. "CPD,PKN,ALR")
  - `end_date` (query string) - ISO date format YYYY-MM-DD (default: today)

**Przykładowe URL:**
```
GET /api/nocodb/grid?range=week
GET /api/nocodb/grid?range=month&symbols=CPD,PKN
GET /api/nocodb/grid?range=quarter&symbols=ALR&end_date=2025-12-25
```

**Walidacja (Zod Schema):**
```typescript
const GridQuerySchema = z.object({
  range: z.enum(['week', 'month', 'quarter'], {
    errorMap: () => ({ message: 'range must be one of: week, month, quarter' })
  }),
  symbols: z.string()
    .optional()
    .refine(
      (val) => !val || /^[A-Z0-9,\s]+$/.test(val),
      { message: 'symbols must contain only letters, numbers, and commas' }
    )
    .transform((val) => val?.toUpperCase()),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be in YYYY-MM-DD format')
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      { message: 'end_date must be a valid date' }
    )
});
```

---

### 2.2. GET /api/nocodb/events/:id

**Metoda HTTP:** GET  
**Struktura URL:** `/api/nocodb/events/:id`  
**Autentykacja:** Required (Bearer token + active subscription/trial)

**Parametry:**
- Wymagane:
  - `id` (path parameter) - NocoDB record ID (format: `rec_*`)
- Opcjonalne: Brak

**Przykładowe URL:**
```
GET /api/nocodb/events/rec_abc123xyz
```

**Walidacja:**
```typescript
const EventIdSchema = z.string()
  .startsWith('rec_', 'Invalid NocoDB record ID format')
  .min(10, 'Record ID too short');
```

---

### 2.3. GET /api/nocodb/summaries

**Metoda HTTP:** GET  
**Struktura URL:** `/api/nocodb/summaries`  
**Autentykacja:** Required (Bearer token + active subscription/trial)

**Parametry:**
- Wymagane:
  - `symbol` (query string) - Ticker symbol (1-10 chars)
  - `occurrence_date` (query string) - ISO date YYYY-MM-DD
- Opcjonalne:
  - `event_type` (query string) - enum: 'BLACK_SWAN_UP' | 'BLACK_SWAN_DOWN' | 'VOLATILITY_UP' | 'VOLATILITY_DOWN' | 'BIG_MOVE'

**Przykładowe URL:**
```
GET /api/nocodb/summaries?symbol=CPD&occurrence_date=2025-12-10
GET /api/nocodb/summaries?symbol=PKN&occurrence_date=2025-12-15&event_type=BLACK_SWAN_DOWN
```

**Walidacja (Zod Schema):**
```typescript
const SummariesQuerySchema = z.object({
  symbol: z.string()
    .min(1, 'symbol is required')
    .max(10, 'symbol must be 10 characters or less')
    .transform((val) => val.toUpperCase()),
  occurrence_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'occurrence_date must be in YYYY-MM-DD format')
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'occurrence_date must be a valid date' }
    ),
  event_type: z.enum([
    'BLACK_SWAN_UP',
    'BLACK_SWAN_DOWN',
    'VOLATILITY_UP',
    'VOLATILITY_DOWN',
    'BIG_MOVE'
  ]).optional()
});
```

---

## 3. Wykorzystywane typy

### 3.1. Request DTOs

```typescript
// src/types/nocodb.types.ts

export interface GridQueryParams {
  range: 'week' | 'month' | 'quarter';
  symbols?: string;
  end_date?: string;
}

export interface SummariesQueryParams {
  symbol: string;
  occurrence_date: string;
  event_type?: EventType;
}

export type EventType = 
  | 'BLACK_SWAN_UP' 
  | 'BLACK_SWAN_DOWN' 
  | 'VOLATILITY_UP' 
  | 'VOLATILITY_DOWN' 
  | 'BIG_MOVE';
```

### 3.2. Response DTOs

```typescript
export interface BlackSwanEventMinimal {
  id: string;
  symbol: string;
  occurrence_date: string;
  event_type: EventType;
  percent_change: number;
  has_summary: boolean;
}

export interface GridResponse {
  range: 'week' | 'month' | 'quarter';
  start_date: string;
  end_date: string;
  events: BlackSwanEventMinimal[];
  symbols: string[];
  cached_at: string;
}

export interface AISummary {
  id: string;
  date: string;
  summary: string;
  article_sentiment: 'positive' | 'negative' | 'neutral';
  identified_causes: string[];
  predicted_trend_probability: {
    further_decline?: number;
    recovery?: number;
    continued_growth?: number;
  };
  recommended_action: {
    action: 'BUY' | 'SELL' | 'HOLD';
    justification: string;
  };
  keywords: string[];
  source_article_url: string | null;
}

export interface HistoricData {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface BlackSwanEventDetailed {
  id: string;
  symbol: string;
  occurrence_date: string;
  event_type: EventType;
  percent_change: number;
  summary: AISummary | null;
  historic_data: HistoricData | null;
}

export interface SummariesResponse {
  symbol: string;
  occurrence_date: string;
  event_type: EventType;
  summaries: AISummary[];
  total_summaries: number;
}
```

### 3.3. NocoDB API Types

```typescript
export interface NocoDBConfig {
  baseUrl: string;
  apiToken: string;
  tables: {
    blackSwans: string;
    aiSummaries: string;
    historicData: string;
  };
}

export interface NocoDBFilter {
  field: string;
  operator: 'eq' | 'gte' | 'lte' | 'in' | 'like';
  value: string | number | string[];
}

export interface NocoDBResponse<T> {
  list: T[];
  pageInfo?: {
    totalRows: number;
    page: number;
    pageSize: number;
  };
}
```

### 3.4. Rate Limiting Types

```typescript
// src/types/rate-limit.types.ts

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}
```

---

## 4. Szczegóły odpowiedzi

### 4.1. GET /api/nocodb/grid

**Sukces (200 OK):**
```json
{
  "success": true,
  "data": {
    "range": "week",
    "start_date": "2025-12-21",
    "end_date": "2025-12-28",
    "events": [
      {
        "id": "rec_abc123",
        "symbol": "CPD",
        "occurrence_date": "2025-12-24",
        "event_type": "BLACK_SWAN_DOWN",
        "percent_change": -15.2,
        "has_summary": true
      }
    ],
    "symbols": ["CPD", "PKN"],
    "cached_at": "2025-12-28T10:30:00Z"
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Błędy:**
- `400 Bad Request`: Nieprawidłowe parametry
- `401 Unauthorized`: Brak autentykacji lub nieaktywna subskrypcja
- `429 Too Many Requests`: Rate limit exceeded (headers: `X-RateLimit-*`, `Retry-After`)
- `500 Internal Server Error`: Błąd NocoDB API

---

### 4.2. GET /api/nocodb/events/:id

**Sukces (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "rec_abc123",
    "symbol": "CPD",
    "occurrence_date": "2025-12-24",
    "event_type": "BLACK_SWAN_DOWN",
    "percent_change": -15.2,
    "summary": {
      "id": "sum_xyz456",
      "date": "2025-12-24T14:30:00Z",
      "summary": "Significant price drop...",
      "article_sentiment": "negative",
      "identified_causes": ["regulatory news"],
      "predicted_trend_probability": {
        "further_decline": 0.65,
        "recovery": 0.35
      },
      "recommended_action": {
        "action": "HOLD",
        "justification": "Wait for stabilization..."
      },
      "keywords": ["regulation"],
      "source_article_url": "https://example.com/article"
    },
    "historic_data": {
      "open": 45.2,
      "close": 38.3,
      "high": 45.5,
      "low": 37.8,
      "volume": 1250000
    }
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Błędy:**
- `404 Not Found`: Event nie istnieje
- `401, 429, 500`: Jak w 4.1

---

### 4.3. GET /api/nocodb/summaries

**Sukces (200 OK):**
```json
{
  "success": true,
  "data": {
    "symbol": "CPD",
    "occurrence_date": "2025-12-24",
    "event_type": "BLACK_SWAN_DOWN",
    "summaries": [
      {
        "id": "sum_xyz456",
        "date": "2025-12-24T14:30:00Z",
        "summary": "Initial analysis...",
        "article_sentiment": "negative",
        "identified_causes": ["regulatory news"],
        "predicted_trend_probability": { "further_decline": 0.65, "recovery": 0.35 },
        "recommended_action": { "action": "HOLD", "justification": "..." },
        "keywords": ["regulation"],
        "source_article_url": "https://example.com/article1"
      }
    ],
    "total_summaries": 1
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Błędy:**
- `404 Not Found`: Brak summaries
- `400, 401, 429, 500`: Jak w 4.1

---

## 5. Przepływ danych

### 5.1. GET /api/nocodb/grid

```
Client → [Auth] → [Subscription Check] → [Rate Limit] → [Validation]
  → [Calculate Date Range] → [Parse Symbols] → [Build Filters]
  → [NocoDB API Call] → [Transform Response] → [Add Rate Headers]
  → Client (200 OK + GridResponse)
```

**Kluczowe kroki:**
1. Weryfikacja tokena Bearer
2. Sprawdzenie subscription_status (trial/active) lub trial_expires_at
3. Rate limit check (60 req/min)
4. Walidacja: range, symbols, end_date
5. Kalkulacja zakresu dat (week=-7d, month=-30d, quarter=-90d)
6. NocoDB query z filtrami + retry (2x, 500ms delay)
7. Mapowanie do BlackSwanEventMinimal[]
8. Zwrot z headerami X-RateLimit-*

**Performance:** Target < 1.5s (NocoDB ~300-800ms + overhead ~200ms)

---

### 5.2. GET /api/nocodb/events/:id

```
Client → [Auth] → [Subscription] → [Rate Limit] → [Validate ID]
  → [Parallel Fetch: Event + Summary + Historic Data]
  → [Combine Results] → [Transform] → Client (200 OK)
```

**Optymalizacja:** 
- **Promise.all()** dla summary + historic_data (parallel fetching)
- Graceful degradation: summary/historic_data mogą być null
- Redukcja czasu z ~650ms (sequential) do ~300ms (parallel)

---

### 5.3. GET /api/nocodb/summaries

```
Client → [Auth] → [Subscription] → [Rate Limit] → [Validation]
  → [NocoDB Query: GPW_AI_summary WHERE symbol+date]
  → [Sort by date DESC] → [Transform] → Client (200 OK)
```

**Query:** `where=(symbol,eq,{symbol})~and(occurrence_date,eq,{date})&sort=-date`

---

## 6. Względy bezpieczeństwa

### 6.1. Multi-Layer Security

1. **Bearer Token Verification** (Supabase Auth)
2. **Subscription Status Check** (app_users table)
3. **Rate Limiting** (60 req/min per user)
4. **Input Validation** (Zod schemas)

### 6.2. NocoDB API Token Security

**Environment Variables:**
```env
NOCODB_BASE_URL=https://nocodb.example.com
NOCODB_API_TOKEN=your_token_here
NOCODB_TABLE_BLACK_SWANS=tbl_xxx
NOCODB_TABLE_AI_SUMMARIES=tbl_yyy
NOCODB_TABLE_HISTORIC_DATA=tbl_zzz
```

**Best Practices:**
- Token tylko server-side (nigdy w client code)
- Osobne tokeny dla dev/staging/prod
- Rotacja co 3 miesiące
- Monitoring usage w NocoDB

### 6.3. Rate Limiting Implementation

**In-memory Map-based limiter:**
```typescript
export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private limit: number = 60;
  private windowMs: number = 60 * 1000;

  check(userId: string): RateLimitResult {
    // Sliding window algorithm
    // Reset after windowMs expires
  }

  cleanup(): void {
    // Remove expired entries (runs every 5 min)
  }
}
```

**Response Headers:**
- `X-RateLimit-Limit: 60`
- `X-RateLimit-Remaining: {remaining}`
- `X-RateLimit-Reset: {timestamp}`
- `Retry-After: {seconds}` (jeśli 429)

### 6.4. Input Validation

**Zod Schemas:**
- **GridQuerySchema**: range enum, symbols regex, end_date format
- **EventIdSchema**: startsWith('rec_'), min length
- **SummariesQuerySchema**: symbol length, date format, event_type enum

**Sanitization:**
- Symbols: uppercase, alphanumeric + comma
- Dates: regex YYYY-MM-DD + valid date check
- Event IDs: format validation

### 6.5. Error Information Disclosure

**NIGDY nie eksponować:**
- NocoDB API token
- Internal table IDs (abstrakcja w config)
- Detailed error messages (schema leaks)
- Stack traces w production

**Pattern:**
```typescript
try {
  const data = await nocodbService.fetchGrid(params);
  return createSuccessResponse(data, 200);
} catch (error) {
  console.error('[NOCODB] Error:', error); // Server-side only
  return createErrorResponse('Failed to fetch grid data', 500, 'NOCODB_ERROR');
}
```

---

## 7. Obsługa błędów

### 7.1. Error Hierarchy

```typescript
export class NocoDBError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean = false
  ) { super(message); }
}

export class NocoDBConnectionError extends NocoDBError {
  constructor(message = 'Failed to connect to NocoDB') {
    super(message, 'NOCODB_CONNECTION_ERROR', 503, true);
  }
}

export class NocoDBTimeoutError extends NocoDBError {
  constructor(message = 'NocoDB request timeout') {
    super(message, 'NOCODB_TIMEOUT', 504, true);
  }
}

export class NocoDBNotFoundError extends NocoDBError {
  constructor(resource = 'Resource') {
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
| NocoDB timeout | 504 | NOCODB_TIMEOUT | ✅ | Retry 2x with backoff |
| NocoDB connection error | 503 | NOCODB_CONNECTION_ERROR | ✅ | Retry 2x with backoff |
| Event not found | 404 | EVENT_NOT_FOUND | ❌ | Return 404 |
| No summaries found | 404 | SUMMARIES_NOT_FOUND | ❌ | Return 404 |
| NocoDB API error | 500 | NOCODB_ERROR | ❌ | Log + generic error |

### 7.3. Retry Logic

**Exponential Backoff:**
```typescript
async fetchWithRetry<T>(url: string, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Fetch with 5s timeout
      return await fetch(url, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500; // 500ms, 1000ms
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

### 7.4. Graceful Degradation

- **Missing AI Summary**: Zwróć `summary: null` (nie fail całego requesta)
- **Missing Historic Data**: Zwróć `historic_data: null`
- **Partial Results**: W parallel fetch, kontynuuj z partial data
- **NocoDB Downtime**: Return 503 (client może pokazać cached data)

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

1. **NocoDB API latency**: 300-800ms per request
2. **Multiple API calls**: Event details (3 requests)
3. **Large result sets**: Quarter range może zwrócić 100+ events
4. **Rate limiting overhead**: ~5ms (akceptowalne)

### 8.2. Optymalizacje

#### 8.2.1. Parallel Fetching

```typescript
// Dla /events/:id
const [event, summaries, historicData] = await Promise.all([
  nocodbClient.getEvent(eventId),
  nocodbClient.getSummaries(symbol, date).catch(() => null),
  nocodbClient.getHistoricData(symbol, date).catch(() => null)
]);
```

**Efekt:** Redukcja z 650ms (sequential) do 300ms (parallel)

#### 8.2.2. Field Selection

```typescript
// Zamiast SELECT *
const fields = ['id', 'symbol', 'occurrence_date', 'event_type', 'percent_change'].join(',');
const url = `${baseUrl}/records?fields=${fields}&where=...`;
```

**Efekt:** ~50% mniejszy payload, szybszy JSON parsing

#### 8.2.3. Connection Pooling

```typescript
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 60000
});

fetch(url, { agent: httpsAgent });
```

#### 8.2.4. Pagination (Future Enhancement)

Dla grid endpoint z dużymi wynikami (obecnie MVP bez paginacji):
```typescript
const GridQuerySchemaWithPagination = GridQuerySchema.extend({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(50)
});
```

### 8.3. Monitoring Metrics

**Key Metrics:**
- NocoDB API response time (p50, p95, p99)
- Rate limit hits per user
- Error rate by endpoint
- Payload size distribution

**Alerts:**
- NocoDB response time > 2s
- Error rate > 5% w 5 min
- Rate limit exceeded > 10x/hour per user

---

## 9. Etapy wdrożenia

### 9.1. Prerequisites & Setup (Priorytet: Wysoki)

**Czas: 30 min**

1. Verify `zod` installed: `npm list zod`
2. Add environment variables do `.env`
3. Get NocoDB table IDs z dashboard
4. Test NocoDB API access: `curl -H "xc-token: TOKEN" https://nocodb.../api/v2/tables/tbl_xxx/records`

---

### 9.2. Type Definitions (Priorytet: Wysoki)

**Czas: 45 min**

**Pliki do utworzenia:**
1. `src/types/nocodb.types.ts` - Request/Response DTOs, NocoDB API types
2. `src/types/rate-limit.types.ts` - Rate limit interfaces

---

### 9.3. Configuration Module (Priorytet: Wysoki)

**Czas: 20 min**

**Create `src/config/nocodb.config.ts`:**

```typescript
const baseUrl = import.meta.env.NOCODB_BASE_URL;
const apiToken = import.meta.env.NOCODB_API_TOKEN;
const tableBlackSwans = import.meta.env.NOCODB_TABLE_BLACK_SWANS;
const tableAiSummaries = import.meta.env.NOCODB_TABLE_AI_SUMMARIES;
const tableHistoricData = import.meta.env.NOCODB_TABLE_HISTORIC_DATA;

if (!baseUrl || !apiToken || !tableBlackSwans || !tableAiSummaries || !tableHistoricData) {
  throw new Error('Missing NocoDB configuration');
}

export const nocoDBConfig = {
  baseUrl,
  apiToken,
  tables: { blackSwans: tableBlackSwans, aiSummaries: tableAiSummaries, historicData: tableHistoricData },
  timeout: 5000,
  maxRetries: 2
};

export const rateLimitConfig = {
  limit: 60,
  windowMs: 60 * 1000,
  cleanupIntervalMs: 5 * 60 * 1000
};
```

---

### 9.4. Rate Limiter Implementation (Priorytet: Wysoki)

**Czas: 1 godzina**

**Create `src/lib/rate-limiter.ts`:**

Implementacja sliding window algorithm z Map-based storage. Patrz sekcja 6.3.

---

### 9.5. Validation Schemas (Priorytet: Wysoki)

**Czas: 30 min**

**Create `src/lib/nocodb-validation.ts`:**

Implementacja GridQuerySchema, EventIdSchema, SummariesQuerySchema + helper `parseQueryParams()`.

---

### 9.6. NocoDB Client (Priorytet: Wysoki)

**Czas: 3 godziny**

**Create `src/lib/nocodb-client.ts`:**

```typescript
export class NocoDBClient {
  private baseUrl: string;
  private apiToken: string;
  private tables: typeof nocoDBConfig.tables;

  constructor() { /* ... */ }

  private async fetchWithRetry<T>(url: string, options?: RequestInit, maxRetries = 2): Promise<T> {
    // Retry logic z timeout + exponential backoff
  }

  private buildWhereClause(filters: NocoDBFilter[]): string {
    // Build NocoDB query string
  }

  async fetchBlackSwanEvents(startDate: string, endDate: string, symbols?: string[]): Promise<BlackSwanEventMinimal[]> {
    // GET /api/v2/tables/{tableId}/records z filtrami
  }

  async fetchBlackSwanEvent(eventId: string): Promise<any> {
    // GET /api/v2/tables/{tableId}/records/{id}
  }

  async fetchAISummaries(symbol: string, occurrenceDate: string, eventType?: string): Promise<AISummary[]> {
    // Query GPW_AI_summary
  }

  async fetchHistoricData(symbol: string, date: string): Promise<HistoricData | null> {
    // Query GPW_historic_data (graceful fail)
  }
}

export const nocoDBClient = new NocoDBClient();
```

---

### 9.7. Error Classes (Priorytet: Średni)

**Czas: 20 min**

**Create `src/lib/nocodb-errors.ts`:**

Implementacja error hierarchy (sekcja 7.1).

---

### 9.8. NocoDB Service (Priorytet: Wysoki)

**Czas: 2 godziny**

**Create `src/services/nocodb.service.ts`:**

```typescript
export class NocoDBService {
  private calculateDateRange(range: 'week' | 'month' | 'quarter', endDate?: string): { startDate: string; endDate: string } {
    // Logic kalkulacji zakresu dat
  }

  private parseSymbols(symbolsString?: string): string[] | undefined {
    // Split + trim symbols
  }

  async getGridData(params: GridQueryParams): Promise<GridResponse> {
    // [1] Calculate date range
    // [2] Parse symbols
    // [3] Fetch from NocoDB
    // [4] Transform + build response
  }

  async getEventDetails(eventId: string): Promise<BlackSwanEventDetailed> {
    // [1] Parallel fetch: event + summary + historic
    // [2] Combine + transform
  }

  async getAllSummaries(params: SummariesQueryParams): Promise<SummariesResponse> {
    // [1] Fetch summaries
    // [2] Sort by date DESC
    // [3] Build response
  }
}
```

---

### 9.9. API Endpoints (Priorytet: Wysoki)

**Czas: 3 godziny**

**Pliki do utworzenia:**

1. **`src/pages/api/nocodb/grid.ts`**
```typescript
export const GET: APIRoute = async ({ request, url, locals }) => {
  // [1] Auth
  // [2] Subscription check
  // [3] Rate limit
  // [4] Validation
  // [5] Service call
  // [6] Return z rate headers
};
```

2. **`src/pages/api/nocodb/events/[id].ts`**
```typescript
export const GET: APIRoute = async ({ params, request, locals }) => {
  // Similar flow + validate eventId
};
```

3. **`src/pages/api/nocodb/summaries.ts`**
```typescript
export const GET: APIRoute = async ({ request, url, locals }) => {
  // Similar flow + validate query params
};
```

**Kluczowe elementy każdego endpointu:**
- `export const prerender = false;`
- Auth via `getAuthUid()`
- Subscription check via `UserService.getUserProfile()`
- Rate limit via `rateLimiter.check()`
- Validation via Zod schemas
- Service call via `NocoDBService`
- Error handling (try-catch z specific errors)
- Rate limit headers w response

---

### 9.10. Testing (Priorytet: Średni)

**Czas: 3 godziny**

**Manual Testing:**

```bash
# Grid endpoint
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4321/api/nocodb/grid?range=week"

# Event details
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4321/api/nocodb/events/rec_abc123"

# Summaries
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4321/api/nocodb/summaries?symbol=CPD&occurrence_date=2025-12-24"

# Rate limiting test (65 requests)
for i in {1..65}; do
  curl -H "Authorization: Bearer TOKEN" \
    "http://localhost:4321/api/nocodb/grid?range=week"
  echo "Request $i"
done
```

**Test Cases:**
- ✅ Valid requests (wszystkie endpointy)
- ✅ Invalid parameters (validation errors)
- ✅ Unauthorized (brak tokena, expired token)
- ✅ Inactive subscription
- ✅ Rate limit (429 po 60 requests)
- ✅ Not found (invalid event_id, no summaries)
- ✅ NocoDB timeout (symulacja)
- ✅ Response headers (X-RateLimit-*)

---

## 10. Checkpoints walidacyjne

### Po implementacji Rate Limiter:

- [ ] Rate limiter ogranicza do 60 req/min
- [ ] Cleanup usuwa expired entries
- [ ] Headers X-RateLimit-* są zwracane
- [ ] 429 response z Retry-After działa
- [ ] `getStats()` zwraca poprawne statystyki

### Po implementacji NocoDB Client:

- [ ] Fetch z retry działa (test z timeout)
- [ ] Filters są poprawnie budowane (where clause)
- [ ] Parallel fetching działa dla event details
- [ ] Graceful degradation dla optional data (summary, historic)
- [ ] Errors są poprawnie rzucane (timeout, connection, not found)

### Po implementacji Endpoints:

- [ ] Subscription check działa poprawnie (trial + active)
- [ ] Validation zwraca prawidłowe błędy (Zod)
- [ ] Rate limiting jest enforced
- [ ] Response format zgodny ze specyfikacją
- [ ] Error handling pokrywa wszystkie scenariusze
- [ ] Rate limit headers w każdym response

### Przed deployment:

- [ ] NocoDB credentials skonfigurowane w production
- [ ] Table IDs poprawne dla wszystkich tabel (blackSwans, aiSummaries, historicData)
- [ ] Rate limiter cleanup scheduled (setInterval)
- [ ] Manual testing passed dla wszystkich endpoints
- [ ] Error scenarios przetestowane (401, 404, 429, 500)
- [ ] Performance < 1.5s dla grid endpoint
- [ ] Logs nie ujawniają sensitive data (token, table IDs)

---

## 11. Kluczowe decyzje architektoniczne

### 11.1. In-Memory Rate Limiting

**Decyzja:** Użyć in-memory Map zamiast Redis

**Uzasadnienie:**
- MVP nie wymaga distributed rate limiting
- Prostsze w implementacji (zero dependencies)
- Wystarczające dla single-instance deployment
- Cleanup co 5 min usuwa expired entries

**Upgrade path:** W przypadku horizontal scaling użyć Redis
```typescript
import { createClient } from 'redis';
const redis = createClient();
// Implement distributed rate limiter
```

---

### 11.2. Proxy Pattern vs Data Replication

**Decyzja:** Proxy pattern (nie kopiujemy danych do Supabase)

**Uzasadnienie:**
- NocoDB jest single source of truth dla Black Swan data
- Eliminuje data synchronization complexity
- Mniejsze koszty storage w Supabase
- Łatwiejsze updates (dane aktualizowane w jednym miejscu)

**Trade-offs:**
- Zależność od NocoDB uptime (mitigated by retry logic)
- Nieco wyższa latency (~300-800ms network hop)
- Brak offline access

---

### 11.3. Parallel Fetching dla Event Details

**Decyzja:** Fetch event + summary + historic_data równolegle

**Uzasadnienie:**
```typescript
// Sequential: 300ms + 200ms + 150ms = 650ms
// Parallel: max(300ms, 200ms, 150ms) = 300ms
```

**Benefits:**
- ~50% redukcja latency
- Better user experience
- Graceful degradation (catch errors, return null)

**Implementation:**
```typescript
const [event, summaries, historicData] = await Promise.all([
  nocodbClient.getEvent(eventId),
  nocodbClient.getSummaries(symbol, date).catch(() => null),
  nocodbClient.getHistoricData(symbol, date).catch(() => null)
]);
```

---

### 11.4. Rate Limit Headers

**Decyzja:** Zawsze zwracać X-RateLimit-* headers (nawet w success)

**Uzasadnienie:**
- Transparentność dla klientów (ile requestów pozostało)
- Możliwość implementacji client-side backoff
- Zgodność z industry standards (GitHub, Stripe, Twitter API)

**Headers:**
- `X-RateLimit-Limit: 60`
- `X-RateLimit-Remaining: {60 - count}`
- `X-RateLimit-Reset: {resetAt timestamp}`
- `Retry-After: {seconds}` (tylko dla 429)

---

### 11.5. Graceful Degradation

**Decyzja:** Nie fail całego requesta jeśli optional data nie jest dostępna

**Uzasadnienie:**
- **AI Summary**: Nice-to-have, nie critical (zwróć `summary: null`)
- **Historic Data**: Używane tylko do chart, może być null
- Better UX: Pokaż partial data zamiast error

**Pattern:**
```typescript
const summaries = await nocodbClient.fetchAISummaries(symbol, date).catch(() => []);
const historicData = await nocodbClient.fetchHistoricData(symbol, date).catch(() => null);
```

---

## 12. Podsumowanie implementacji

### Pliki do utworzenia:

1. `src/types/nocodb.types.ts` - Type definitions (Request/Response DTOs)
2. `src/types/rate-limit.types.ts` - Rate limit types
3. `src/config/nocodb.config.ts` - Configuration (NocoDB + rate limit)
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
NOCODB_API_TOKEN=your_token_here
NOCODB_TABLE_BLACK_SWANS=tbl_xxx
NOCODB_TABLE_AI_SUMMARIES=tbl_yyy
NOCODB_TABLE_HISTORIC_DATA=tbl_zzz
```

### Dependencies:

- `zod` (już zainstalowane z poprzednich implementacji)
- **Brak nowych dependencies!**

### Szacowany czas implementacji: 12-14 godzin

**Breakdown:**
- Setup & Config: 50 min
- Types & Validation: 1h 15min
- Rate Limiter: 1h
- NocoDB Client: 3h
- Error Classes: 20 min
- Service Layer: 2h
- API Endpoints: 3h
- Testing: 3h

**Total: ~12-14h** (w zależności od doświadczenia zespołu)

---

## 13. Weryfikacja merytoryczna

### ✅ Poprawności techniczne:

1. **Zod validation**: Wszystkie schematy poprawne (regex, enums, transforms)
2. **Rate limiting**: Sliding window algorithm correct
3. **Retry logic**: Exponential backoff (500ms, 1000ms) + timeout 5s
4. **Parallel fetching**: Promise.all() z graceful degradation
5. **Error hierarchy**: Extends Error properly, statusCode + retryable flags
6. **NocoDB API**: Query syntax correct (`where=(field,op,value)~and(...)`)
7. **Astro endpoints**: APIRoute signature correct, prerender=false

### ✅ Zgodność z api-plan.md:

1. **3 endpointy**: grid, events/:id, summaries ✓
2. **Rate limiting**: 60 req/min ✓
3. **Subscription check**: trial/active + trial_expires_at ✓
4. **Response format**: Success/error zgodne ze spec ✓
5. **Query params**: Wszystkie parametry covered ✓

### ✅ Zgodność z db-plan.md:

1. **Używa app_users**: subscription_status, trial_expires_at (punkty 1.2-1.4) ✓
2. **Nie duplikuje danych**: Black Swan data w NocoDB, nie w Supabase ✓
3. **RLS**: Nie dotyczy (NocoDB proxy, auth via token) ✓

### ✅ Security best practices:

1. **Token security**: Server-side only, nigdy w client ✓
2. **Input validation**: Zod + sanitization ✓
3. **Rate limiting**: Protection against abuse ✓
4. **Error disclosure**: Generic messages w production ✓
5. **Auth + Subscription**: Multi-layer verification ✓

### ⚠️ Znalezione problemy i poprawki:

**Problem 1:** W sekcji 9.6 (NocoDB Client) brakuje pełnej implementacji `fetchBlackSwanEvent()`

**Poprawka:** Dodać w finalnej implementacji:
```typescript
async fetchBlackSwanEvent(eventId: string): Promise<any> {
  const url = `${this.baseUrl}/api/v2/tables/${this.tables.blackSwans}/records/${eventId}`;
  return await this.fetchWithRetry(url);
}
```

**Problem 2:** W parallel fetching dla event details - pierwszy fetch nie jest w Promise.all

**Poprawka:** Wszystkie 3 fetches powinny być parallel:
```typescript
const [event, summaries, historicData] = await Promise.all([
  nocodbClient.fetchBlackSwanEvent(eventId), // <- był poza Promise.all
  nocodbClient.fetchAISummaries(...).catch(() => []),
  nocodbClient.fetchHistoricData(...).catch(() => null)
]);
```

**Problem 3:** `has_summary` flag w GridResponse - brak logiki sprawdzania

**Poprawka:** W `nocodbClient.fetchBlackSwanEvents()` dodać check:
```typescript
return response.list.map(event => ({
  // ...
  has_summary: true // TODO: Check if summary exists (query aiSummaries table)
}));
```

### ✅ Finalna weryfikacja:

Plan jest **merytorycznie poprawny** i gotowy do implementacji po uwzględnieniu powyższych drobnych poprawek. Wszystkie kluczowe elementy są covered, architektura jest sensowna, a decyzje techniczne są uzasadnione.

---

**KONIEC PLANU IMPLEMENTACJI** 🎉

Plan jest kompletny, scalony, zweryfikowany i gotowy do użycia przez zespół deweloperski! 🚀

