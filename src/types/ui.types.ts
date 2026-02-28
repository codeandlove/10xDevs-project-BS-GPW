/**
 * UI-specific types for Black Swan Grid application
 */

import type { DateRange, EventType, BlackSwanEventMinimal, AISummary } from "./nocodb.types";
import type { UserProfileDTO } from "./types";

// ============================================
// Grid View Types
// ============================================

/**
 * Grid cell data structure - discriminated union for type safety
 */
export type GridCellData = GridCellEmpty | GridCellWithEvent;

/**
 * Empty grid cell (no event)
 */
export interface GridCellEmpty {
  eventId: null;
  symbol: string;
  date: string; // YYYY-MM-DD
  isWeekend?: boolean; // Whether date is a weekend (Saturday or Sunday)
  isToday?: boolean; // Whether date is today
}

/**
 * Grid cell with event data
 */
export interface GridCellWithEvent {
  eventId: string;
  symbol: string;
  date: string; // YYYY-MM-DD
  eventType: EventType;
  percentChange: number;
  hasSummary: boolean;
  isWeekend?: boolean; // Whether date is a weekend (Saturday or Sunday)
  isToday?: boolean; // Whether date is today
}

/**
 * Grid state for URL params and persistence
 */
export interface GridState {
  range: DateRange;
  symbols: string[]; // Selected ticker filters
  eventTypes?: EventType[]; // Selected event type filters
  sortField?: "date" | "percent_change" | "symbol"; // Sort field
  sortDirection?: "asc" | "desc"; // Sort direction
  startDate?: string; // YYYY-MM-DD - For custom date ranges (infinite scroll)
  endDate?: string; // YYYY-MM-DD - For custom date ranges (infinite scroll)
  eventId?: string; // Selected event for sidebar
  scrollPosition?: number;
}

/**
 * Grid filter options
 */
export interface GridFilters {
  symbols: string[];
  range: DateRange;
  endDate?: string;
}

// ============================================
// Layout Types
// ============================================

/**
 * Responsive breakpoint
 */
export type Breakpoint = "mobile" | "tablet" | "desktop";

/**
 * View mode for summary detail
 */
export type SummaryViewMode = "sidebar" | "drawer" | "standalone";

// ============================================
// User Session Types
// ============================================

/**
 * User session context
 */
export interface UserSession {
  user: UserProfileDTO | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Subscription banner type
 */
export type SubscriptionBannerType =
  | "trial_expiring"
  | "trial_expired"
  | "subscription_expiring"
  | "subscription_expired";

// ============================================
// Cache Types
// ============================================

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  lastAccessed: number; // Timestamp of last access (for LRU eviction)
}

/**
 * Cache options
 */
export interface CacheOptions {
  ttl?: number; // Default: 5 minutes
  staleWhileRevalidate?: boolean; // Default: true
  retry?: number; // Retry attempts on fetch failure
}

// ============================================
// Component Props Types
// ============================================

/**
 * Props for virtualized grid
 */
export interface VirtualizedGridProps {
  events: BlackSwanEventMinimal[];
  range: DateRange;
  symbols: string[];
  onCellClick: (eventId: string) => void;
  isLoading?: boolean;
}

/**
 * Props for grid cell
 */
export interface GridCellProps {
  data: GridCellData;
  onClick?: () => void;
  isSelected?: boolean;
}

/**
 * Props for range selector
 */
export interface RangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/**
 * Props for ticker filter
 */
export interface TickerFilterProps {
  symbols: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/**
 * Props for summary sidebar/drawer
 */
export interface SummaryViewProps {
  eventId: string;
  mode: SummaryViewMode;
  onClose: () => void;
}

/**
 * Props for event header
 */
export interface EventHeaderProps {
  symbol: string;
  occurrenceDate: string;
  eventType: EventType;
  percentChange: number;
}

/**
 * Props for summary card
 */
export interface SummaryCardProps {
  summary: AISummary;
}

// ============================================
// Error Types
// ============================================

/**
 * UI Error with user-friendly message
 */
export interface UIError {
  message: string;
  code?: string;
  retry?: () => void;
}

/**
 * Loading state
 */
export type LoadingState = "idle" | "loading" | "success" | "error";
