# API Endpoint Implementation Plan: NocoDB Proxy - Black Swan Data (2.4) - CZĘŚĆ 1/3

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
  symbols: z.string().optional().refine(
    (val) => !val || val.split(',').every(s => s.length > 0 && s.length <= 10),
    { message: 'Each symbol must be 1-10 characters' }
  ),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD').optional()
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
const EventIdSchema = z.string().startsWith('rec_', 'Invalid NocoDB record ID format');
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
  symbol: z.string().min(1).max(10, 'Symbol must be 1-10 characters'),
  occurrence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
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

/**
 * Query parameters for grid endpoint
 */
export interface GridQueryParams {
  range: 'week' | 'month' | 'quarter';
  symbols?: string; // comma-separated
  end_date?: string; // YYYY-MM-DD
}

/**
 * Query parameters for summaries endpoint
 */
export interface SummariesQueryParams {
  symbol: string;
  occurrence_date: string; // YYYY-MM-DD
  event_type?: EventType;
}

/**
 * Event type enum
 */
export type EventType = 
  | 'BLACK_SWAN_UP' 
  | 'BLACK_SWAN_DOWN' 
  | 'VOLATILITY_UP' 
  | 'VOLATILITY_DOWN' 
  | 'BIG_MOVE';
```

### 3.2. Response DTOs

```typescript
// src/types/nocodb.types.ts (continued)

/**
 * Black Swan event (grid view - minimal)
 */
export interface BlackSwanEventMinimal {
  id: string; // NocoDB record ID
  symbol: string;
  occurrence_date: string; // YYYY-MM-DD
  event_type: EventType;
  percent_change: number;
  has_summary: boolean;
}

/**
 * Grid response
 */
export interface GridResponse {
  range: 'week' | 'month' | 'quarter';
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  events: BlackSwanEventMinimal[];
  symbols: string[]; // List of symbols in response
  cached_at: string; // ISO timestamp
}

/**
 * AI Summary
 */
export interface AISummary {
  id: string;
  date: string; // ISO timestamp
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

/**
 * Historic data (OHLC)
 */
export interface HistoricData {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/**
 * Black Swan event (detailed view)
 */
export interface BlackSwanEventDetailed {
  id: string;
  symbol: string;
  occurrence_date: string;
  event_type: EventType;
  percent_change: number;
  summary: AISummary | null; // First/primary summary
  historic_data: HistoricData | null;
}

/**
 * Summaries response
 */
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
// src/types/nocodb.types.ts (continued)

/**
 * NocoDB API configuration
 */
export interface NocoDBConfig {
  baseUrl: string;
  apiToken: string;
  tables: {
    blackSwans: string; // Table ID for GPW_black_swans
    aiSummaries: string; // Table ID for GPW_AI_summary
    historicData: string; // Table ID for GPW_historic_data
  };
}

/**
 * NocoDB query filter
 */
export interface NocoDBFilter {
  field: string;
  operator: 'eq' | 'gte' | 'lte' | 'in' | 'like';
  value: string | number | string[];
}

/**
 * NocoDB API response wrapper
 */
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
  resetAt: number; // Unix timestamp (ms)
}

export interface RateLimitStore {
  get(userId: string): RateLimitEntry | undefined;
  set(userId: string, entry: RateLimitEntry): void;
  delete(userId: string): void;
  cleanup(): void; // Remove expired entries
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds until reset (if not allowed)
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
      },
      {
        "id": "rec_xyz789",
        "symbol": "PKN",
        "occurrence_date": "2025-12-26",
        "event_type": "VOLATILITY_UP",
        "percent_change": 8.5,
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
  ```json
  {
    "success": false,
    "error": {
      "message": "Validation failed",
      "code": "VALIDATION_ERROR",
      "details": {
        "range": "range must be one of: week, month, quarter"
      }
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```

- `401 Unauthorized`: Brak lub nieprawidłowa autentykacja
  ```json
  {
    "success": false,
    "error": {
      "message": "Active subscription required",
      "code": "SUBSCRIPTION_REQUIRED"
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```

- `429 Too Many Requests`: Rate limit exceeded
  ```json
  {
    "success": false,
    "error": {
      "message": "Rate limit exceeded",
      "code": "RATE_LIMIT_EXCEEDED",
      "details": {
        "retry_after": 45
      }
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```
  **Headers:**
  ```
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1735381845
  Retry-After: 45
  ```

- `500 Internal Server Error`: Błąd NocoDB API
  ```json
  {
    "success": false,
    "error": {
      "message": "Failed to fetch grid data",
      "code": "NOCODB_ERROR"
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```

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
      "summary": "Significant price drop attributed to unexpected regulatory announcement...",
      "article_sentiment": "negative",
      "identified_causes": ["regulatory news", "earnings miss"],
      "predicted_trend_probability": {
        "further_decline": 0.65,
        "recovery": 0.35
      },
      "recommended_action": {
        "action": "HOLD",
        "justification": "Wait for market stabilization before making decisions..."
      },
      "keywords": ["regulation", "earnings", "CPD"],
      "source_article_url": "https://example.com/article/123"
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
  ```json
  {
    "success": false,
    "error": {
      "message": "Event not found",
      "code": "EVENT_NOT_FOUND"
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```

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
        "summary": "Initial analysis based on breaking news...",
        "article_sentiment": "negative",
        "identified_causes": ["regulatory news"],
        "predicted_trend_probability": {
          "further_decline": 0.65,
          "recovery": 0.35
        },
        "recommended_action": {
          "action": "HOLD",
          "justification": "Wait for more information..."
        },
        "keywords": ["regulation"],
        "source_article_url": "https://example.com/article1"
      },
      {
        "id": "sum_abc789",
        "date": "2025-12-24T16:45:00Z",
        "summary": "Updated analysis with additional market data...",
        "article_sentiment": "neutral",
        "identified_causes": ["regulatory news", "market correction"],
        "predicted_trend_probability": {
          "further_decline": 0.45,
          "recovery": 0.55
        },
        "recommended_action": {
          "action": "BUY",
          "justification": "Market overreaction presents buying opportunity..."
        },
        "keywords": ["regulation", "correction", "opportunity"],
        "source_article_url": "https://example.com/article2"
      }
    ],
    "total_summaries": 2
  },
  "timestamp": "2025-12-28T10:30:00Z"
}
```

**Błędy:**
- `404 Not Found`: Brak summaries dla wydarzenia
  ```json
  {
    "success": false,
    "error": {
      "message": "No summaries found",
      "code": "SUMMARIES_NOT_FOUND"
    },
    "timestamp": "2025-12-28T10:30:00Z"
  }
  ```

---

**KONIEC CZĘŚCI 1/3**

Następna część będzie zawierać:
- Przepływ danych (szczegółowe diagramy)
- Względy bezpieczeństwa
- Obsługa błędów

