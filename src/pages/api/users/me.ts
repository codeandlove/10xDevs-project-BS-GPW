/**
 * GET/PATCH/DELETE /api/users/me
 *
 * User profile management endpoints
 * - GET: Retrieve authenticated user's profile
 * - PATCH: Update authenticated user's metadata
 * - DELETE: Soft delete authenticated user's account
 */
import type { APIRoute } from "astro";
import { UserService } from "@/services/user.service";
import { AuditService } from "@/services/audit.service";
import { getAuthUid } from "@/lib/auth";
import { isValidMetadata } from "@/lib/validation";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-utils";

export const prerender = false;

/**
 * GET /api/users/me
 * Retrieve current user's profile
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // Extract auth_uid from token
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse("Unauthorized", 401, "Valid session required");
    }

    // Initialize service
    const userService = new UserService(supabase);

    // Get user profile
    const profile = await userService.getUserProfile(authUid);
    if (!profile) {
      return createErrorResponse("User not found", 404, "Please complete registration");
    }

    return createSuccessResponse({ user: profile }, 200);
  } catch {
    return createErrorResponse("An unexpected error occurred", 500);
  }
};

/**
 * PATCH /api/users/me
 * Update current user's metadata
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // Extract auth_uid from token
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse("Unauthorized", 401, "Valid session required");
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON", 400, "Request body must be valid JSON");
    }

    // Validate metadata
    const bodyObj = body as Record<string, unknown>;
    if (!bodyObj.metadata || !isValidMetadata(bodyObj.metadata)) {
      return createErrorResponse("Validation failed", 400, "Invalid metadata format", ["metadata must be an object"]);
    }

    // Initialize services
    const userService = new UserService(supabase);
    const auditService = new AuditService(supabase);

    // Get current metadata for audit
    const currentProfile = await userService.getUserProfile(authUid);
    if (!currentProfile) {
      return createErrorResponse("User not found", 404, "Please complete registration");
    }

    // Update metadata
    const { data, error } = await userService.updateUserMetadata(authUid, bodyObj.metadata);

    if (error || !data) {
      return createErrorResponse("Failed to update metadata", 500, error?.message || "Unknown error");
    }

    // Log audit entry
    await auditService.logSubscriptionChange({
      user_id: authUid,
      change_type: "metadata_updated",
      previous: { metadata: currentProfile.metadata },
      current: { metadata: data.metadata },
    });

    return createSuccessResponse(
      {
        user: {
          auth_uid: data.auth_uid,
          metadata: data.metadata,
          updated_at: data.updated_at,
        },
      },
      200
    );
  } catch {
    return createErrorResponse("An unexpected error occurred", 500);
  }
};

/**
 * DELETE /api/users/me
 * Soft delete current user's account (GDPR compliance)
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // Extract auth_uid from token
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse("Unauthorized", 401, "Valid session required");
    }

    // Initialize services
    const userService = new UserService(supabase);
    const auditService = new AuditService(supabase);

    // Soft delete user
    const { error, deletedAt } = await userService.softDeleteUser(authUid);

    if (error) {
      return createErrorResponse("Failed to delete user", 500, error.message);
    }

    // Log audit entry
    await auditService.logSubscriptionChange({
      user_id: authUid,
      change_type: "account_deleted",
      previous: { deleted_at: null },
      current: { deleted_at: deletedAt },
    });

    return createSuccessResponse(
      {
        message: "Account successfully deleted",
        deleted_at: deletedAt,
      },
      200
    );
  } catch {
    return createErrorResponse("An unexpected error occurred", 500);
  }
};
