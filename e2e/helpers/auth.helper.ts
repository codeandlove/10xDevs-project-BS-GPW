/**
 * Auth helper for E2E tests
 */

import type { Page } from "@playwright/test";

export interface LoginOptions {
  email: string;
  password: string;
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

export async function loginViaAPI(page: Page, { email, password }: LoginOptions) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is not set in environment variables");
  }

  const response = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    data: { email, password },
  });

  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Login failed: ${JSON.stringify(error)}`);
  }

  const authData = await response.json();

  // Extract hostname from Supabase URL for storage key
  const url = new URL(supabaseUrl);
  const storageKey = `sb-${url.hostname.replace(/\./g, "-")}-auth-token`;

  // Set auth tokens in localStorage AND cookies
  await page.goto("/");

  // Set in localStorage (for client-side Supabase client)
  await page.evaluate(
    ({ data, key }) => {
      const authToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        expires_in: data.expires_in,
        token_type: data.token_type,
        user: data.user,
      };
      localStorage.setItem(key, JSON.stringify(authToken));
    },
    { data: authData, key: storageKey }
  );

  // Set cookies for server-side middleware
  await page.context().addCookies([
    {
      name: storageKey,
      value: JSON.stringify({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
      }),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "sb-access-token",
      value: authData.access_token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "sb-refresh-token",
      value: authData.refresh_token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  return authData;
}
