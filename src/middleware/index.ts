/**
 * Middleware for authentication and authorization
 * According to api-plan.md section 3.2 - Authorization Strategy
 */

import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

// Protected routes that require authentication + active subscription (API only)
const PROTECTED_ROUTES = ["/api/nocodb"];

// Routes that require authentication but NOT subscription
const AUTH_ONLY_ROUTES = ["/api/users", "/api/subscriptions"];

// Public routes (accessible without authentication)
const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/register", "/403", "/404", "/500"];

// Public API routes (no authentication required)
const PUBLIC_API_ROUTES = ["/api/users/initialize"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, redirect } = context;

  context.locals.supabase = supabaseClient;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => url.pathname.startsWith(route));
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((route) => url.pathname.startsWith(route));

  // Public routes - exact match for "/" or startsWith for others
  const isPublicRoute = PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      return url.pathname === "/";
    }
    return url.pathname.startsWith(route);
  });

  // Check if this is a public API route
  const isPublicApiRoute = PUBLIC_API_ROUTES.some((route) => url.pathname === route);

  // Skip middleware for API webhooks, public routes, and public API routes
  if (url.pathname === "/api/webhooks/stripe" || isPublicRoute || isPublicApiRoute) {
    return next();
  }

  // Routes that require authentication (with or without subscription check)
  if (isProtectedRoute || isAuthOnlyRoute) {
    let userId = null;

    if (url.pathname.startsWith("/api/")) {
      const authHeader = context.request.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      userId = userData.user.id;
    } else {
      return next();
    }

    const { data: user, error: userError } = await supabaseClient
      .from("app_users")
      .select("subscription_status, trial_expires_at, deleted_at")
      .eq("auth_uid", userId)
      .is("deleted_at", null)
      .single();

    if (userError || !user) {
      if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return redirect("/auth/login");
      }
    }

    if (isProtectedRoute) {
      const now = new Date();
      const trialExpiresAt = user.trial_expires_at ? new Date(user.trial_expires_at) : null;

      let hasAccess = false;

      if (user.subscription_status === "active") {
        hasAccess = true;
      } else if (user.subscription_status === "trial") {
        hasAccess = trialExpiresAt ? trialExpiresAt > now : false;
      }

      if (url.pathname.startsWith("/api/") && !hasAccess) {
        return new Response(
          JSON.stringify({
            error: "Subscription required",
            message: "Active subscription is required to access premium data",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  return next();
});
