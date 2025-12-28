# API Endpoint Implementation Plan: NocoDB Proxy - Black Swan Data (2.4) - CZĘŚĆ 3/3

## 9. Etapy wdrożenia

### 9.1. Prerequisites & Setup (Priorytet: Wysoki)

**Czas: 30 min**

1. **Verify dependencies**
   ```bash
   # Zod should already be installed from previous implementations
   npm list zod
   ```

2. **Add environment variables**
   ```env
   # .env
   NOCODB_BASE_URL=https://nocodb.example.com
   NOCODB_API_TOKEN=your_nocodb_api_token_here
   NOCODB_TABLE_BLACK_SWANS=tbl_xxx
   NOCODB_TABLE_AI_SUMMARIES=tbl_yyy
   NOCODB_TABLE_HISTORIC_DATA=tbl_zzz
   ```

3. **Get NocoDB table IDs**
   - Login to NocoDB dashboard
   - Navigate to each table
   - Copy table ID from URL (format: `tbl_xxxxx`)
   - Add to `.env`

4. **Test NocoDB API access**
   ```bash
   # Test API token
   curl -H "xc-token: YOUR_TOKEN" \
     https://nocodb.example.com/api/v2/tables/tbl_xxx/records
   ```

---

### 9.2. Type Definitions (Priorytet: Wysoki)

**Czas: 45 min**

1. **Create `src/types/nocodb.types.ts`**
   - Add all interfaces from Part 1, Section 3
   - Export request/response DTOs
   - Export NocoDB API types

2. **Create `src/types/rate-limit.types.ts`**
   - Add RateLimitEntry, RateLimitStore, RateLimitResult interfaces

3. **Extend `src/types/types.ts`** if needed
   - Add helper types for date range calculations

---

### 9.3. Configuration Module (Priorytet: Wysoki)

**Czas: 20 min**

**Create `src/config/nocodb.config.ts`:**

```typescript
/**
 * NocoDB configuration
 */

const baseUrl = import.meta.env.NOCODB_BASE_URL;
const apiToken = import.meta.env.NOCODB_API_TOKEN;
const tableBlackSwans = import.meta.env.NOCODB_TABLE_BLACK_SWANS;
const tableAiSummaries = import.meta.env.NOCODB_TABLE_AI_SUMMARIES;
const tableHistoricData = import.meta.env.NOCODB_TABLE_HISTORIC_DATA;

if (!baseUrl || !apiToken || !tableBlackSwans || !tableAiSummaries || !tableHistoricData) {
  throw new Error('Missing NocoDB configuration in environment variables');
}

export const nocoDBConfig = {
  baseUrl,
  apiToken,
  tables: {
    blackSwans: tableBlackSwans,
    aiSummaries: tableAiSummaries,
    historicData: tableHistoricData
  },
  timeout: 5000, // 5 seconds
  maxRetries: 2
};

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  limit: 60, // requests per window
  windowMs: 60 * 1000, // 1 minute
  cleanupIntervalMs: 5 * 60 * 1000 // cleanup every 5 minutes
};
```

---

### 9.4. Rate Limiter Implementation (Priorytet: Wysoki)

**Czas: 1 godzina**

**Create `src/lib/rate-limiter.ts`:**

```typescript
/**
 * In-memory rate limiter
 * Implements sliding window algorithm
 */
import type { RateLimitEntry, RateLimitResult } from '@/types/rate-limit.types';
import { rateLimitConfig } from '@/config/nocodb.config';

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit?: number, windowMs?: number) {
    this.limit = limit || rateLimitConfig.limit;
    this.windowMs = windowMs || rateLimitConfig.windowMs;
  }

  /**
   * Check if request is allowed for user
   */
  check(userId: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(userId);

    // No entry or expired window
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

    // Limit exceeded
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

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [userId, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(userId);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[RATE_LIMITER] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Get current stats (for debugging)
   */
  getStats() {
    return {
      totalUsers: this.store.size,
      limit: this.limit,
      windowMs: this.windowMs
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Schedule cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, rateLimitConfig.cleanupIntervalMs);
}
```

---

### 9.5. Validation Schemas (Priorytet: Wysoki)

**Czas: 30 min**

**Create `src/lib/nocodb-validation.ts`:**

```typescript
/**
 * Zod validation schemas for NocoDB endpoints
 */
import { z } from 'zod';

/**
 * Grid query parameters schema
 */
export const GridQuerySchema = z.object({
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

/**
 * Event ID parameter schema
 */
export const EventIdSchema = z.string()
  .startsWith('rec_', 'Invalid NocoDB record ID format')
  .min(10, 'Record ID too short');

/**
 * Summaries query parameters schema
 */
export const SummariesQuerySchema = z.object({
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

/**
 * Helper: Parse and validate query params
 */
export function parseQueryParams<T>(
  url: URL,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const params = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(params);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}
```

---

### 9.6. NocoDB Client (Priorytet: Wysoki)

**Czas: 3 godziny**

**Create `src/lib/nocodb-client.ts`:**

```typescript
/**
 * NocoDB API client
 * Handles all communication with NocoDB
 */
import type {
  BlackSwanEventMinimal,
  BlackSwanEventDetailed,
  AISummary,
  HistoricData,
  NocoDBFilter
} from '@/types/nocodb.types';
import { nocoDBConfig } from '@/config/nocodb.config';
import { NocoDBConnectionError, NocoDBTimeoutError, NocoDBNotFoundError } from './nocodb-errors';

export class NocoDBClient {
  private baseUrl: string;
  private apiToken: string;
  private tables: typeof nocoDBConfig.tables;

  constructor() {
    this.baseUrl = nocoDBConfig.baseUrl;
    this.apiToken = nocoDBConfig.apiToken;
    this.tables = nocoDBConfig.tables;
  }

  /**
   * Fetch with retry logic and timeout
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    maxRetries: number = nocoDBConfig.maxRetries
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          nocoDBConfig.timeout
        );

        const response = await fetch(url, {
          ...options,
          headers: {
            'xc-token': this.apiToken,
            'Content-Type': 'application/json',
            ...options.headers
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
          throw new NocoDBNotFoundError();
        }

        if (!response.ok) {
          throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();

      } catch (error) {
        lastError = error as Error;

        // AbortError = timeout
        if (lastError.name === 'AbortError') {
          lastError = new NocoDBTimeoutError();
        }

        // Don't retry on last attempt
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500; // 500ms, 1000ms
          console.log(`[NOCODB] Retry attempt ${attempt + 1} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw new NocoDBConnectionError(lastError!.message);
  }

  /**
   * Build query string from filters
   */
  private buildWhereClause(filters: NocoDBFilter[]): string {
    return filters
      .map(f => {
        if (f.operator === 'in' && Array.isArray(f.value)) {
          return `(${f.field},in,${f.value.join(',')})`;
        }
        return `(${f.field},${f.operator},${f.value})`;
      })
      .join('~and');
  }

  /**
   * Fetch Black Swan events (grid view)
   */
  async fetchBlackSwanEvents(
    startDate: string,
    endDate: string,
    symbols?: string[]
  ): Promise<BlackSwanEventMinimal[]> {
    const filters: NocoDBFilter[] = [
      { field: 'occurrence_date', operator: 'gte', value: startDate },
      { field: 'occurrence_date', operator: 'lte', value: endDate }
    ];

    if (symbols && symbols.length > 0) {
      filters.push({ field: 'symbol', operator: 'in', value: symbols });
    }

    const where = this.buildWhereClause(filters);
    const fields = 'id,symbol,occurrence_date,event_type,percent_change';
    const url = `${this.baseUrl}/api/v2/tables/${this.tables.blackSwans}/records?where=${encodeURIComponent(where)}&fields=${fields}&sort=-occurrence_date`;

    const response = await this.fetchWithRetry<{ list: any[] }>(url);

    return response.list.map(event => ({
      id: event.id,
      symbol: event.symbol,
      occurrence_date: event.occurrence_date,
      event_type: event.event_type,
      percent_change: parseFloat(event.percent_change),
      has_summary: true // TODO: Check if summary exists
    }));
  }

  /**
   * Fetch single Black Swan event
   */
  async fetchBlackSwanEvent(eventId: string): Promise<any> {
    const url = `${this.baseUrl}/api/v2/tables/${this.tables.blackSwans}/records/${eventId}`;
    return await this.fetchWithRetry(url);
  }

  /**
   * Fetch AI summaries for event
   */
  async fetchAISummaries(
    symbol: string,
    occurrenceDate: string,
    eventType?: string
  ): Promise<AISummary[]> {
    const filters: NocoDBFilter[] = [
      { field: 'symbol', operator: 'eq', value: symbol },
      { field: 'occurrence_date', operator: 'eq', value: occurrenceDate }
    ];

    if (eventType) {
      filters.push({ field: 'event_type', operator: 'eq', value: eventType });
    }

    const where = this.buildWhereClause(filters);
    const url = `${this.baseUrl}/api/v2/tables/${this.tables.aiSummaries}/records?where=${encodeURIComponent(where)}&sort=-date`;

    const response = await this.fetchWithRetry<{ list: any[] }>(url);

    return response.list.map(summary => ({
      id: summary.id,
      date: summary.date,
      summary: summary.summary,
      article_sentiment: summary.article_sentiment,
      identified_causes: summary.identified_causes || [],
      predicted_trend_probability: summary.predicted_trend_probability || {},
      recommended_action: summary.recommended_action || { action: 'HOLD', justification: '' },
      keywords: summary.keywords || [],
      source_article_url: summary.source_article_url
    }));
  }

  /**
   * Fetch historic data for symbol
   */
  async fetchHistoricData(
    symbol: string,
    date: string
  ): Promise<HistoricData | null> {
    try {
      const filters: NocoDBFilter[] = [
        { field: 'symbol', operator: 'eq', value: symbol },
        { field: 'date', operator: 'eq', value: date }
      ];

      const where = this.buildWhereClause(filters);
      const url = `${this.baseUrl}/api/v2/tables/${this.tables.historicData}/records?where=${encodeURIComponent(where)}`;

      const response = await this.fetchWithRetry<{ list: any[] }>(url);

      if (response.list.length === 0) {
        return null;
      }

      const data = response.list[0];
      return {
        open: parseFloat(data.open),
        close: parseFloat(data.close),
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        volume: parseInt(data.volume)
      };
    } catch {
      // Graceful degradation - historic data is optional
      return null;
    }
  }
}

// Singleton instance
export const nocoDBClient = new NocoDBClient();
```

---

### 9.7. Error Classes (Priorytet: Średni)

**Czas: 20 min**

**Create `src/lib/nocodb-errors.ts`:**

```typescript
/**
 * Custom error classes for NocoDB operations
 */

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

---

### 9.8. NocoDB Service (Priorytet: Wysoki)

**Czas: 2 godziny**

**Create `src/services/nocodb.service.ts`:**

```typescript
/**
 * NocoDB Service Layer
 * Business logic for Black Swan data operations
 */
import type {
  GridQueryParams,
  GridResponse,
  BlackSwanEventDetailed,
  SummariesQueryParams,
  SummariesResponse
} from '@/types/nocodb.types';
import { nocoDBClient } from '@/lib/nocodb-client';

export class NocoDBService {
  /**
   * Calculate date range based on range parameter
   */
  private calculateDateRange(range: 'week' | 'month' | 'quarter', endDate?: string): { startDate: string; endDate: string } {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(end);

    switch (range) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setDate(end.getDate() - 30);
        break;
      case 'quarter':
        start.setDate(end.getDate() - 90);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }

  /**
   * Parse comma-separated symbols
   */
  private parseSymbols(symbolsString?: string): string[] | undefined {
    if (!symbolsString) return undefined;
    return symbolsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Get grid data
   */
  async getGridData(params: GridQueryParams): Promise<GridResponse> {
    const { range, symbols: symbolsString, end_date } = params;

    // Calculate date range
    const { startDate, endDate } = this.calculateDateRange(range, end_date);

    // Parse symbols
    const symbols = this.parseSymbols(symbolsString);

    // Fetch events from NocoDB
    const events = await nocoDBClient.fetchBlackSwanEvents(startDate, endDate, symbols);

    // Extract unique symbols from results
    const uniqueSymbols = [...new Set(events.map(e => e.symbol))];

    return {
      range,
      start_date: startDate,
      end_date: endDate,
      events,
      symbols: uniqueSymbols,
      cached_at: new Date().toISOString()
    };
  }

  /**
   * Get event details with first AI summary
   */
  async getEventDetails(eventId: string): Promise<BlackSwanEventDetailed> {
    // Fetch event and related data in parallel
    const [event, summaries, historicData] = await Promise.all([
      nocoDBClient.fetchBlackSwanEvent(eventId),
      nocoDBClient.fetchAISummaries(event.symbol, event.occurrence_date).catch(() => []),
      nocoDBClient.fetchHistoricData(event.symbol, event.occurrence_date).catch(() => null)
    ]);

    return {
      id: event.id,
      symbol: event.symbol,
      occurrence_date: event.occurrence_date,
      event_type: event.event_type,
      percent_change: parseFloat(event.percent_change),
      summary: summaries.length > 0 ? summaries[0] : null,
      historic_data: historicData
    };
  }

  /**
   * Get all AI summaries for event
   */
  async getAllSummaries(params: SummariesQueryParams): Promise<SummariesResponse> {
    const { symbol, occurrence_date, event_type } = params;

    const summaries = await nocoDBClient.fetchAISummaries(symbol, occurrence_date, event_type);

    if (summaries.length === 0) {
      throw new Error('No summaries found');
    }

    return {
      symbol,
      occurrence_date,
      event_type: event_type || 'BLACK_SWAN_DOWN', // Default if not provided
      summaries,
      total_summaries: summaries.length
    };
  }
}
```

---

**KONIEC CZĘŚCI 3/3 - będzie kontynuowane z etapami implementacji endpointów**

