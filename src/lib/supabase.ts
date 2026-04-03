import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const missingConfigMessage =
  "Faltan las variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY.";

let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
}

export function getSupabaseConfigError(): string | null {
  return isSupabaseConfigured ? null : missingConfigMessage;
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(missingConfigMessage);
  }

  return supabaseClient;
}
