/// <reference types="astro/client" />

import type { SupabaseClient, Session } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        subscription_status: string;
        trial_expires_at: string | null;
        deleted_at: string | null;
      };
      session?: Session;
    }
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly NOCODB_API_URL: string;
  readonly NOCODB_API_TOKEN: string;
  readonly NOCODB_TABLE_BLACK_SWANS: string;
  readonly NOCODB_TABLE_AI_SUMMARY: string;
  readonly NOCODB_TABLE_HISTORIC_DATA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
