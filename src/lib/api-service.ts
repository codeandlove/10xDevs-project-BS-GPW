/**
 * API Service Functions
 * High-level functions for API calls
 */

import { apiClient, API_ENDPOINTS } from "./api-client";
import type {
  GridResponse,
  EventDetailsResponse,
  SummariesResponse,
  SymbolsResponse,
  DateRange,
} from "@/types/nocodb.types";
import type { UserProfileDTO } from "@/types/types";

/**
 * Fetch grid data by explicit date range (for infinite scroll)
 */
export async function fetchGridData(startDate: string, endDate: string, symbols: string[]): Promise<GridResponse>;

/**
 * Fetch grid data by range preset (for quick filters - backward compatible)
 */
export async function fetchGridData(range: DateRange, symbols?: string[], endDate?: string): Promise<GridResponse>;

/**
 * Fetch grid data - implementation
 */
export async function fetchGridData(
  startDateOrRange: string | DateRange,
  endDateOrSymbols?: string | string[],
  symbolsOrEndDate?: string[] | string
): Promise<GridResponse> {
  // Explicit date range mode
  if (
    typeof startDateOrRange === "string" &&
    startDateOrRange.match(/^\d{4}-\d{2}-\d{2}$/) &&
    typeof endDateOrSymbols === "string" &&
    endDateOrSymbols.match(/^\d{4}-\d{2}-\d{2}$/)
  ) {
    const startDate = startDateOrRange;
    const endDate = endDateOrSymbols;
    const symbols = ((symbolsOrEndDate as string[]) || []).filter((s) => s && s.trim().length > 0).slice(0, 200);
    const symbolsParam = symbols.length > 0 ? symbols.join(",") : undefined;
    const url = API_ENDPOINTS.gridDataByDateRange(startDate, endDate, symbolsParam);
    return apiClient.get<GridResponse>(url);
  }

  // Range preset mode (backward compatible)
  const range = startDateOrRange as DateRange;
  const symbols = ((endDateOrSymbols as string[]) || []).filter((s) => s && s.trim().length > 0).slice(0, 200);
  const endDate = symbolsOrEndDate as string | undefined;
  const symbolsParam = symbols.length > 0 ? symbols.join(",") : undefined;
  const url = API_ENDPOINTS.gridData(range, symbolsParam, endDate);
  return apiClient.get<GridResponse>(url);
}

/**
 * Fetch event details
 */
export async function fetchEventDetails(eventId: string): Promise<EventDetailsResponse> {
  const url = API_ENDPOINTS.eventDetails(eventId);
  return apiClient.get<EventDetailsResponse>(url);
}

/**
 * Fetch summaries
 */
export async function fetchSummaries(
  symbol: string,
  occurrenceDate: string,
  eventType?: string
): Promise<SummariesResponse> {
  const url = API_ENDPOINTS.summaries(symbol, occurrenceDate, eventType);
  return apiClient.get<SummariesResponse>(url);
}

/**
 * Fetch GPW symbols
 * @param range - Optional date range to include event counts per symbol
 */
export async function fetchSymbols(range?: DateRange): Promise<SymbolsResponse> {
  const url = range ? `${API_ENDPOINTS.symbols()}?range=${range}` : API_ENDPOINTS.symbols();
  return apiClient.get<SymbolsResponse>(url);
}

/**
 * Fetch user profile
 */
export async function fetchUserProfile(): Promise<UserProfileDTO> {
  const url = API_ENDPOINTS.userProfile();
  return apiClient.get<UserProfileDTO>(url);
}

/**
 * Initialize new user with trial
 */
export async function initializeUser(authUid: string, email?: string) {
  const url = API_ENDPOINTS.initializeUser();
  return apiClient.post(url, { auth_uid: authUid, email }, { skipAuth: true });
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(priceId: string) {
  const url = API_ENDPOINTS.createCheckout();
  return apiClient.post(url, { price_id: priceId });
}

/**
 * Create Stripe portal session
 */
export async function createPortalSession(returnUrl?: string) {
  const url = API_ENDPOINTS.createPortal();
  return apiClient.post(url, { return_url: returnUrl || window.location.href });
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus() {
  const url = API_ENDPOINTS.subscriptionStatus();
  return apiClient.get(url);
}
