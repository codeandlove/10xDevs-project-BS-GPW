/**
 * Middleware for authentication and authorization
 * According to api-plan.md section 3.2 - Authorization Strategy
 */

import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

// Protected routes that require authentication + active subscription
const PROTECTED_ROUTES = ["/grid", "/summary", "/event"];

// Public routes (accessible without authentication)
const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/register", "/checkout", "/403", "/404", "/500"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, redirect } = context;
  context.locals.supabase = supabaseClient;

  // Check if current route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => url.pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some((route) => url.pathname.startsWith(route));

  // Skip middleware for API webhooks and public routes
  if (url.pathname === "/api/webhooks/stripe" || isPublicRoute) {
    return next();
  }

  // Protected routes: verify session and subscription
  if (isProtectedRoute) {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    // No valid session - redirect to login with returnUrl
    if (sessionError || !session) {
      const returnUrl = encodeURIComponent(url.pathname + url.search);
      return redirect(`/auth/login?returnUrl=${returnUrl}`);
    }

    // Fetch user with subscription status
    const { data: user, error: userError } = await supabaseClient
      .from("app_users")
      .select("subscription_status, trial_expires_at, deleted_at")
      .eq("auth_uid", session.user.id)
      .is("deleted_at", null)
      .single();

    if (userError || !user) {
      // User record not found - redirect to login
      return redirect("/auth/login");
    }

    // Check subscription access
    const now = new Date();
    const trialExpiresAt = user.trial_expires_at ? new Date(user.trial_expires_at) : null;
    const hasActiveSubscription = user.subscription_status === "active" || user.subscription_status === "trial";
    const hasValidTrial = trialExpiresAt && trialExpiresAt > now;

    if (!hasActiveSubscription && !hasValidTrial) {
      // No active subscription or expired trial - redirect to 403
      return redirect("/403?reason=subscription_required");
    }

    // Attach user context for use in pages/API routes
    context.locals.user = user;
    context.locals.session = session;
  }

  return next();
});
