/**
 * NocoDB Proxy Types
 * Types for Black Swan Events data from NocoDB
 */

/**
 * Event type enum for Black Swan events
 */
export type EventType = "BLACK_SWAN_UP" | "BLACK_SWAN_DOWN" | "VOLATILITY_UP" | "VOLATILITY_DOWN" | "BIG_MOVE";

/**
 * Article sentiment type
 */
export type ArticleSentiment = "positive" | "negative" | "neutral";

/**
 * Date range type for grid queries
 */
export type DateRange = "week" | "month" | "quarter";

// ============================================
// Request DTOs
// ============================================

/**
 * Query parameters for grid endpoint
 */
export interface GridQueryParams {
  range: DateRange;
  symbols?: string; // comma-separated ticker symbols
  end_date?: string; // YYYY-MM-DD format
}

/**
 * Query parameters for summaries endpoint
 */
export interface SummariesQueryParams {
  symbol: string;
  occurrence_date: string; // YYYY-MM-DD
  event_type?: EventType;
}

// ============================================
// Response DTOs
// ============================================

/**
 * Black Swan event (grid view - minimal data)
 */
export interface BlackSwanEventMinimal {
  id: string; // NocoDB record ID (rec_*)
  symbol: string;
  occurrence_date: string; // YYYY-MM-DD
  event_type: EventType;
  percent_change: number;
  has_summary: boolean;
}

/**
 * Grid response with date range and events
 */
export interface GridResponse {
  range: DateRange;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  events: BlackSwanEventMinimal[];
  symbols: string[]; // Unique symbols in response
  cached_at: string; // ISO timestamp
}

/**
 * AI Summary data
 */
export interface AISummary {
  id: string;
  date: string; // ISO timestamp
  summary: string;
  article_sentiment: ArticleSentiment;
  identified_causes: string[];
  predicted_trend_probability: {
    further_decline?: number;
    recovery?: number;
    continued_growth?: number;
  };
  source_url?: string;
}

/**
 * Historic price data (OHLC)
 */
export interface HistoricDataPoint {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Black Swan event (detailed view)
 */
export interface BlackSwanEventDetailed {
  id: string; // NocoDB record ID
  symbol: string;
  occurrence_date: string; // YYYY-MM-DD
  event_type: EventType;
  percent_change: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  first_summary?: AISummary; // First AI analysis
  historic_data: HistoricDataPoint[]; // 30 days before event
}

/**
 * Event details response
 */
export interface EventDetailsResponse {
  event: BlackSwanEventDetailed;
  cached_at: string; // ISO timestamp
}

/**
 * Summaries response
 */
export interface SummariesResponse {
  symbol: string;
  occurrence_date: string;
  event_type?: EventType;
  summaries: AISummary[];
  total_count: number;
  cached_at: string; // ISO timestamp
}

// ============================================
// Internal Types (NocoDB raw data)
// ============================================

/**
 * NocoDB raw event record
 */
export interface NocoDBEventRecord {
  Id: string; // NocoDB record ID
  symbol: string;
  occurrence_date: string;
  event_type: string;
  percent_change: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}

/**
 * NocoDB raw summary record
 */
export interface NocoDBSummaryRecord {
  Id: string;
  symbol: string;
  occurrence_date: string;
  summary: string;
  article_sentiment: string;
  identified_causes?: string; // JSON string
  predicted_trend_probability?: string; // JSON string
  source_url?: string;
  created_at: string;
}

/**
 * NocoDB raw historic data record
 */
export interface NocoDBHistoricRecord {
  Id: string;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * NocoDB API response wrapper
 */
export interface NocoDBResponse<T> {
  list: T[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}
