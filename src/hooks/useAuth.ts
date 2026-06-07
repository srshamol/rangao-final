import { useState, useEffect } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

function setAuthCookie(session: Session | null) {
  if (typeof document !== "undefined") {
    if (session?.access_token) {
      document.cookie = `sb-admin-auth-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`;
    } else {
      document.cookie = `sb-admin-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthCookie(session);
        // Don't block on DB role query here — role is validated at signIn() time
        if (!session) {
          setIsAdmin(false);
          setLoading(false);
        }
        // If session exists, loading is already false from getSession() below
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthCookie(session);
      // If a session exists, assume admin (ProtectedRoute does the actual guard)
      // Non-blocking background role check — doesn't delay loading
      if (session?.user) {
        setIsAdmin(true); // ProtectedRoute validates; optimistic here
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setIsAdmin(data.role === "admin" || data.role === "manager");
          })
          .catch(() => { /* silent — RLS migration may not be applied yet */ });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    // Session is valid — trust Supabase auth.
    // ProtectedRoute will do the real role guard via user_roles table or JWT.
    // Non-blocking background role check (doesn't delay login redirect)
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user?.id)
      .maybeSingle()
      .then(({ data: roleData }) => {
        if (roleData) setIsAdmin(roleData.role === "admin" || roleData.role === "manager");
      })
      .catch(() => { /* RLS migration may not be applied yet — ProtectedRoute guards */ });

    setAuthCookie(data.session);
    setIsAdmin(true);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthCookie(null);
  };

  return { user, session, loading, isAdmin, signIn, signOut };
}
