// src/types.ts

/**
 * Data Transfer Objects (DTOs) and Command Models for the application.
 * These types are derived from the database models and API plan.
 */
import type { Database } from "../db/database.types.ts";

// DTO for User Initialization
export interface InitializeUserDTO {
  auth_uid: string; // UUID
  email?: string; // Optional email for logging
}

// Response DTO for User Initialization
export interface InitializeUserResponseDTO {
  success: boolean;
  user: {
    auth_uid: string;
    role: string;
    subscription_status: Database["public"]["Enums"]["subscription_status"];
    trial_expires_at: string | null;
    created_at: string;
  };
}

// DTO for User Profile Retrieval
export interface UserProfileDTO {
  auth_uid: string;
  role: string;
  subscription_status: Database["public"]["Enums"]["subscription_status"];
  trial_expires_at: string | null;
  current_period_end: string | null;
  plan_id: string | null;
  stripe_customer_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// DTO for User Metadata Update
export interface UpdateUserMetadataDTO {
  metadata?: Record<string, unknown>;
}

// Response DTO for User Metadata Update
export interface UpdateUserMetadataResponseDTO {
  success: boolean;
  user: {
    auth_uid: string;
    metadata: Record<string, unknown>;
    updated_at: string;
  };
}

// Command Model for Soft-Deleting a User
export interface SoftDeleteUserCommand {
  auth_uid: string;
}

// ============================================
// Subscription Management Types
// ============================================

export type {
  CreateCheckoutDTO,
  CreatePortalDTO,
  SubscriptionStatusDTO,
  CheckoutSessionDTO,
  PortalSessionDTO,
} from "./subscription.types";

// ============================================
// Webhook Types
// ============================================

export type {
  StripeWebhookEvent,
  WebhookEventType,
  WebhookProcessingResult,
  WebhookEventRecord,
  ProcessEventResult,
} from "./webhook.types";

// ============================================
// NocoDB Proxy Types
// ============================================

export type {
  EventType,
  ArticleSentiment,
  DateRange,
  GridQueryParams,
  SummariesQueryParams,
  BlackSwanEventMinimal,
  GridResponse,
  AISummary,
  HistoricDataPoint,
  BlackSwanEventDetailed,
  EventDetailsResponse,
  SummariesResponse,
} from "./nocodb.types";
