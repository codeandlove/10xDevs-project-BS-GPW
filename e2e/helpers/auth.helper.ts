/**
 * Auth helper for E2E tests
 */

import { Page } from "@playwright/test";

export interface LoginOptions {
  email: string;
  password: string;
}

export async function loginViaAPI(page: Page, { email, password }: LoginOptions) {
  const supabaseUrl = "http://127.0.0.1:54321";
  const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

  const response = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: {
      "apikey": supabaseAnonKey,
      "Content-Type": "application/json",
    },
    data: { email, password },
  });

  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Login failed: ${JSON.stringify(error)}`);
  }

  const authData = await response.json();
  
  // Set auth tokens in localStorage AND cookies
  await page.goto("/");
  
  // Set in localStorage (for client-side Supabase client)
  await page.evaluate((data) => {
    const authToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user,
    };
    localStorage.setItem("sb-127.0.0.1:54321-auth-token", JSON.stringify(authToken));
  }, authData);
  
  // Set cookies for server-side middleware
  await page.context().addCookies([
    {
      name: "sb-127.0.0.1:54321-auth-token",
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
