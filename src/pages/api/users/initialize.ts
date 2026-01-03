/**
 * POST /api/users/initialize
 *
 * Initialize a new user in the system
 * Creates user record with trial subscription status
 */
import type { APIRoute } from "astro";
import { UserService } from "@/services/user.service";
import { AuditService } from "@/services/audit.service";
import { isUUID } from "@/lib/validation";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-utils";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON", 400, "Request body must be valid JSON");
    }

    // Validate required fields
    const bodyObj = body as Record<string, unknown>;
    if (!bodyObj.auth_uid) {
      return createErrorResponse("Validation failed", 400, "Missing required field: auth_uid", [
        "auth_uid is required",
      ]);
    }

    // Validate UUID format
    if (!isUUID(bodyObj.auth_uid)) {
      return createErrorResponse("Validation failed", 400, "Invalid auth_uid format", [
        "auth_uid must be a valid UUID",
      ]);
    }

    // Initialize services
    const userService = new UserService(supabase);
    const auditService = new AuditService(supabase);

    // Call service to initialize user
    const { data, error } = await userService.initializeUser({
      auth_uid: bodyObj.auth_uid as string,
      email: bodyObj.email as string | undefined,
    });

    if (error) {
      // Handle specific database errors
      if (error.code === "23505") {
        // Unique constraint violation
        return createErrorResponse("User already exists", 409, "A user with this auth_uid already exists");
      }

      return createErrorResponse("Failed to initialize user", 500, error.message);
    }

    if (!data) {
      return createErrorResponse("Failed to create user", 500, "User creation returned no data");
    }

    // Log audit entry for user creation
    await auditService.logSubscriptionChange({
      user_id: data.auth_uid,
      change_type: "user_initialized",
      previous: null,
      current: {
        subscription_status: data.subscription_status,
        trial_expires_at: data.trial_expires_at,
      },
    });

    return createSuccessResponse(
      {
        user: data,
      },
      201
    );
  } catch {
    return createErrorResponse("An unexpected error occurred", 500);
  }
};
