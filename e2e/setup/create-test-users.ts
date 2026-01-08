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

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env");
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
  console.log(`\n📝 Processing user: ${user.email}`);

  // Try to get existing user by email
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === user.email);

  let authUid: string;

  if (existingUser) {
    console.log(`   ✓ User already exists in auth`);
    authUid = existingUser.id;
  } else {
    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      console.error(`   ❌ Failed to create auth user:`, createError);
      return false;
    }

    authUid = newUser.user.id;
    console.log(`   ✓ Created auth user`);
  }

  // Check if app_user exists
  const { data: appUser, error: fetchError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth_uid", authUid)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 = not found (which is ok)
    console.error(`   ❌ Error checking app_users:`, fetchError);
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
      console.error(`   ❌ Failed to update app_user:`, updateError);
      return false;
    }

    console.log(`   ✓ Updated app_user with subscription status: ${user.subscription_status}`);
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
      console.error(`   ❌ Failed to create app_user:`, insertError);
      return false;
    }

    console.log(`   ✓ Created app_user with subscription status: ${user.subscription_status}`);
  }

  return true;
}

async function main() {
  console.log("🧪 Setting up E2E test users...\n");

  let successCount = 0;
  let failCount = 0;

  for (const user of TEST_USERS) {
    const success = await createTestUser(user);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Successfully set up: ${successCount} users`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} users`);
  }
  console.log("=".repeat(50));

  console.log("\n📋 Test credentials:");
  console.log("─".repeat(50));
  TEST_USERS.forEach((user) => {
    console.log(`${user.email} / ${user.password}`);
    console.log(`  Status: ${user.subscription_status}`);
    if (user.trial_expires_at) {
      console.log(`  Trial expires: ${user.trial_expires_at}`);
    }
  });
  console.log("─".repeat(50));

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
