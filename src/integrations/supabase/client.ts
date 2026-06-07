import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Single shared client — both customer and admin use the same auth session.
// Admin access is controlled by RLS (user_roles table) not by separate sessions.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storageKey: 'sb-rangao-auth-token',
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// supabaseAdmin is an alias for supabase — kept for backward compatibility
// so all existing imports of supabaseAdmin continue to work unchanged
export const supabaseAdmin = supabase;

// Backward compatibility helper
export const getSupabase = () => supabase;