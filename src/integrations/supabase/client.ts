import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

let supabaseInstance: any = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseInstance;
};

// Export a Proxy to lazy-load the client on demand without breaking standard imports
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabase();
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  }
});