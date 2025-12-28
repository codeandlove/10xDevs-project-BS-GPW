/**
 * NocoDB Client
 * HTTP client for NocoDB API communication
 */

import type {
  NocoDBResponse,
  NocoDBEventRecord,
  NocoDBSummaryRecord,
  NocoDBHistoricRecord,
} from "../types/nocodb.types";

/**
 * NocoDB API configuration
 */
const NOCODB_API_URL = import.meta.env.NOCODB_API_URL || "https://api.nocodb.com";
const NOCODB_API_TOKEN = import.meta.env.NOCODB_API_TOKEN;
const NOCODB_TIMEOUT = 5000; // 5 seconds

/**
 * NocoDB table IDs (from environment)
 */
export const NOCODB_TABLES = {
  BLACK_SWANS: import.meta.env.NOCODB_TABLE_BLACK_SWANS,
  AI_SUMMARY: import.meta.env.NOCODB_TABLE_AI_SUMMARY,
  HISTORIC_DATA: import.meta.env.NOCODB_TABLE_HISTORIC_DATA,
} as const;

/**
 * NocoDB API error
 */
export class NocoDBError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code = "NOCODB_ERROR"
  ) {
    super(message);
    this.name = "NocoDBError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Query filter builder for NocoDB
 */
export class NocoDBQueryBuilder {
  private filters: string[] = [];
  private sortBy?: string;
  private sortDesc = false;
  private limitValue = 100;
  private offsetValue = 0;

  /**
   * Add filter condition
   * @param field - Field name
   * @param operator - Comparison operator
   * @param value - Value to compare
   */
  where(field: string, operator: string, value: string | number): this {
    const encodedValue = encodeURIComponent(String(value));
    this.filters.push(`(${field},${operator},${encodedValue})`);
    return this;
  }

  /**
   * Add IN filter for array values
   * @param field - Field name
   * @param values - Array of values
   */
  whereIn(field: string, values: string[]): this {
    const encodedValues = values.map((v) => encodeURIComponent(v)).join(",");
    this.filters.push(`(${field},in,${encodedValues})`);
    return this;
  }

  /**
   * Set sort field and direction
   */
  sort(field: string, desc = false): this {
    this.sortBy = field;
    this.sortDesc = desc;
    return this;
  }

  /**
   * Set result limit
   */
  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  /**
   * Set offset for pagination
   */
  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  /**
   * Build query string
   */
  build(): string {
    const params = new URLSearchParams();

    if (this.filters.length > 0) {
      params.set("where", this.filters.join("~and"));
    }

    if (this.sortBy) {
      params.set("sort", this.sortDesc ? `-${this.sortBy}` : this.sortBy);
    }

    params.set("limit", String(this.limitValue));
    params.set("offset", String(this.offsetValue));

    return params.toString();
  }
}

/**
 * NocoDB HTTP Client
 */
export class NocoDBClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    if (!NOCODB_API_TOKEN) {
      throw new Error("NOCODB_API_TOKEN environment variable is required");
    }
    this.baseUrl = NOCODB_API_URL;
    this.token = NOCODB_API_TOKEN;
  }

  /**
   * Make HTTP request to NocoDB API with retry
   */
  private async request<T>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOCODB_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "xc-token": this.token,
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new NocoDBError(`NocoDB API error: ${response.statusText}`, response.status, "NOCODB_API_ERROR");
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);

      // Retry on network errors
      if (retries > 0 && (error instanceof TypeError || error.name === "AbortError")) {
        console.warn(`[NocoDB] Request failed, retrying... (${retries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
        return this.request<T>(endpoint, options, retries - 1);
      }

      if (error instanceof NocoDBError) {
        throw error;
      }

      if (error.name === "AbortError") {
        throw new NocoDBError("NocoDB request timeout", 504, "TIMEOUT");
      }

      throw new NocoDBError(error instanceof Error ? error.message : "Unknown NocoDB error", 500, "UNKNOWN_ERROR");
    }
  }

  /**
   * Query records from a table
   */
  async queryRecords<T>(tableId: string, queryBuilder: NocoDBQueryBuilder): Promise<NocoDBResponse<T>> {
    const queryString = queryBuilder.build();
    const endpoint = `/api/v2/tables/${tableId}/records?${queryString}`;

    return this.request<NocoDBResponse<T>>(endpoint);
  }

  /**
   * Get single record by ID
   */
  async getRecord<T>(tableId: string, recordId: string): Promise<T> {
    const endpoint = `/api/v2/tables/${tableId}/records/${recordId}`;
    return this.request<T>(endpoint);
  }

  /**
   * Query Black Swan events with filters
   */
  async queryBlackSwanEvents(queryBuilder: NocoDBQueryBuilder): Promise<NocoDBResponse<NocoDBEventRecord>> {
    return this.queryRecords<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, queryBuilder);
  }

  /**
   * Get single Black Swan event
   */
  async getBlackSwanEvent(eventId: string): Promise<NocoDBEventRecord> {
    return this.getRecord<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, eventId);
  }

  /**
   * Query AI summaries
   */
  async queryAISummaries(queryBuilder: NocoDBQueryBuilder): Promise<NocoDBResponse<NocoDBSummaryRecord>> {
    return this.queryRecords<NocoDBSummaryRecord>(NOCODB_TABLES.AI_SUMMARY, queryBuilder);
  }

  /**
   * Query historic data
   */
  async queryHistoricData(queryBuilder: NocoDBQueryBuilder): Promise<NocoDBResponse<NocoDBHistoricRecord>> {
    return this.queryRecords<NocoDBHistoricRecord>(NOCODB_TABLES.HISTORIC_DATA, queryBuilder);
  }
}

/**
 * Singleton instance
 */
export const nocoDBClient = new NocoDBClient();
