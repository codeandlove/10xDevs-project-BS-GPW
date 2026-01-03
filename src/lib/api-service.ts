/**
 * API Service Functions
 * High-level functions for API calls
 */

import { apiClient, API_ENDPOINTS } from "./api-client";
import type { GridResponse, EventDetailsResponse, SummariesResponse, DateRange } from "@/types/nocodb.types";
import type { UserProfileDTO } from "@/types/types";

/**
 * Fetch grid data
 */
export async function fetchGridData(range: DateRange, symbols: string[] = [], endDate?: string): Promise<GridResponse> {
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
  return apiClient.post(url, { auth_uid: authUid, email });
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
