import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const missingConfigMessage =
  "Faltan las variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY.";

let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
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

export async function signInWithPassword(
  email: string,
  password: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export function onAuthStateChange(
  callback: (session: Session | null, user: User | null) => void
) {
  const supabase = getSupabaseClient();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session?.user ?? null;
    callback(session, user);
  });

  return () => subscription?.unsubscribe();
}
