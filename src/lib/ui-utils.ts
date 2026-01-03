/**
 * Utility functions for UI components
 */

import type { DateRange } from "@/types/nocodb.types";

/**
 * Get array of dates for given date range
 */
export function getDatesInRange(range: DateRange): string[] {
  const today = new Date();
  const dates: string[] = [];
  let days: number;

  switch (range) {
    case "week":
      days = 7;
      break;
    case "month":
      days = 30;
      break;
    case "quarter":
      days = 90;
      break;
    default:
      days = 7;
  }

  // Generate dates from today backwards
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split("T")[0]); // YYYY-MM-DD format
  }

  return dates.reverse(); // Oldest to newest
}

/**
 * Get color class based on event type
 */
export function getEventTypeColor(eventType: string): string {
  switch (eventType) {
    case "BLACK_SWAN_UP":
      return "bg-green-100 text-green-900 border-green-300";
    case "BLACK_SWAN_DOWN":
      return "bg-red-100 text-red-900 border-red-300";
    case "VOLATILITY_UP":
      return "bg-orange-100 text-orange-900 border-orange-300";
    case "VOLATILITY_DOWN":
      return "bg-yellow-100 text-yellow-900 border-yellow-300";
    case "BIG_MOVE":
      return "bg-blue-100 text-blue-900 border-blue-300";
    default:
      return "bg-gray-100 text-gray-900 border-gray-300";
  }
}

/**
 * Get badge variant based on event type
 */
export function getEventTypeBadgeVariant(eventType: string): "default" | "destructive" | "outline" | "secondary" {
  switch (eventType) {
    case "BLACK_SWAN_DOWN":
      return "destructive";
    case "BLACK_SWAN_UP":
      return "default";
    default:
      return "secondary";
  }
}

/**
 * Format percent change with sign
 */
export function formatPercentChange(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format date to readable format
 */
export function formatDate(dateString: string, locale = "pl-PL"): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format date to short format
 */
export function formatDateShort(dateString: string, locale = "pl-PL"): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get sentiment color
 */
export function getSentimentColor(sentiment: string): string {
  switch (sentiment.toLowerCase()) {
    case "positive":
      return "text-green-600 bg-green-50 border-green-200";
    case "negative":
      return "text-red-600 bg-red-50 border-red-200";
    case "neutral":
      return "text-gray-600 bg-gray-50 border-gray-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

/**
 * Get sentiment label
 */
export function getSentimentLabel(sentiment: string): string {
  switch (sentiment.toLowerCase()) {
    case "positive":
      return "Pozytywny";
    case "negative":
      return "Negatywny";
    case "neutral":
      return "Neutralny";
    default:
      return "Nieznany";
  }
}

/**
 * Get recommended action color
 */
export function getActionColor(action: string): string {
  switch (action.toUpperCase()) {
    case "BUY":
      return "text-green-700 bg-green-100 border-green-300";
    case "SELL":
      return "text-red-700 bg-red-100 border-red-300";
    case "HOLD":
      return "text-yellow-700 bg-yellow-100 border-yellow-300";
    default:
      return "text-gray-700 bg-gray-100 border-gray-300";
  }
}

/**
 * Get recommended action label
 */
export function getActionLabel(action: string): string {
  switch (action.toUpperCase()) {
    case "BUY":
      return "Kup";
    case "SELL":
      return "Sprzedaj";
    case "HOLD":
      return "Trzymaj";
    default:
      return action;
  }
}

/**
 * Calculate days remaining
 */
export function daysRemaining(dateString: string | null): number | null {
  if (!dateString) return null;
  const targetDate = new Date(dateString);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get subscription status label
 */
export function getSubscriptionStatusLabel(status: string): string {
  switch (status) {
    case "trial":
      return "Trial";
    case "active":
      return "Aktywna";
    case "past_due":
      return "Zaległość w płatnościach";
    case "canceled":
      return "Anulowana";
    case "expired":
      return "Wygasła";
    default:
      return "Nieznany";
  }
}

/**
 * Get subscription status color
 */
export function getSubscriptionStatusColor(status: string): string {
  switch (status) {
    case "trial":
      return "text-blue-700 bg-blue-100 border-blue-300";
    case "active":
      return "text-green-700 bg-green-100 border-green-300";
    case "past_due":
      return "text-orange-700 bg-orange-100 border-orange-300";
    case "canceled":
    case "expired":
      return "text-red-700 bg-red-100 border-red-300";
    default:
      return "text-gray-700 bg-gray-100 border-gray-300";
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
