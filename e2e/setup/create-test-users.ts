/**
 * E2E Test Setup Script
 * Creates test users in Supabase if they don't exist
 * Run this before E2E tests to ensure test users are available
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "../../.env");
config({ path: envPath });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestUser {
  email: string;
  password: string;
  subscription_status: "active" | "trial" | "canceled";
  trial_expires_at: string | null;
}

const TEST_USERS: TestUser[] = [
  {
    email: "test@example.com",
    password: "Test123!@#",
    subscription_status: "active",
    trial_expires_at: null,
  },
  {
    email: "trial@example.com",
    password: "Test123!@#",
    subscription_status: "trial",
    trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    email: "expired@example.com",
    password: "Test123!@#",
    subscription_status: "canceled",
    trial_expires_at: "2025-01-01T00:00:00Z",
  },
  {
    email: "userb@example.com",
    password: "Test123!@#",
    subscription_status: "active",
    trial_expires_at: null,
  },
];

async function createTestUser(user: TestUser) {
  // Try to get existing user by email
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === user.email);

  let authUid: string;

  if (existingUser) {
    authUid = existingUser.id;
  } else {
    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      return false;
    }

    authUid = newUser.user.id;
  }

  // Check if app_user exists
  const { data: appUser, error: fetchError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth_uid", authUid)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 = not found (which is ok)
    return false;
  }

  if (appUser) {
    // Update existing app_user
    const { error: updateError } = await supabase
      .from("app_users")
      .update({
        subscription_status: user.subscription_status,
        trial_expires_at: user.trial_expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_uid", authUid);

    if (updateError) {
      return false;
    }
  } else {
    // Create new app_user
    const { error: insertError } = await supabase.from("app_users").insert({
      auth_uid: authUid,
      subscription_status: user.subscription_status,
      trial_expires_at: user.trial_expires_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      return false;
    }
  }

  return true;
}

async function main() {
  let failCount = 0;

  for (const user of TEST_USERS) {
    const success = await createTestUser(user);
    if (!success) {
      failCount++;
    }
  }

  TEST_USERS.forEach((user) => {
    if (user.trial_expires_at) {
      // Trial user configured
    }
  });

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(() => {
  process.exit(1);
});
