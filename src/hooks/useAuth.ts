import { useState, useEffect, useCallback } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { ALL_STAFF_ROLES, canAccessAdminRoute, type AppRole } from "@/lib/permissions";

function setAuthCookie(session: Session | null) {
  if (typeof document !== "undefined") {
    if (session?.access_token) {
      const maxAge = session.expires_in || 3600;
      document.cookie = `sb-admin-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
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
  const [role, setRole] = useState<AppRole | null>(null);

  const resolveRole = useCallback(async (userObj: User | null): Promise<AppRole | null> => {
    if (!userObj) return null;
    
    // Designated platform super admin
    if (userObj.email?.toLowerCase() === "bdinfosky@gmail.com") {
      return "super_admin";
    }

    // Check JWT app_metadata first
    const jwtRole = userObj.app_metadata?.role as AppRole | undefined;
    if (jwtRole && ALL_STAFF_ROLES.includes(jwtRole)) {
      return jwtRole;
    }

    // Fallback: query user_roles table
    try {
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userObj.id)
        .maybeSingle();

      if (data?.role && ALL_STAFF_ROLES.includes(data.role as AppRole)) {
        return data.role as AppRole;
      }
      return "admin";
    } catch {
      return "admin";
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthCookie(session);

        if (!session) {
          setIsAdmin(false);
          setRole(null);
          setLoading(false);
        } else {
          const userRole = await resolveRole(session.user);
          setRole(userRole);
          setIsAdmin(!!userRole);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthCookie(session);

      if (session?.user) {
        const userRole = await resolveRole(session.user);
        setRole(userRole);
        setIsAdmin(!!userRole);
      } else {
        setIsAdmin(false);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [resolveRole]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    setAuthCookie(data.session);
    if (data.user) {
      const userRole = await resolveRole(data.user);
      setRole(userRole);
      setIsAdmin(!!userRole);
    }
    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setAuthCookie(null);
      setUser(null);
      setSession(null);
      setRole(null);
      setIsAdmin(false);
      try {
        localStorage.removeItem("sb-rangao-auth-token");
      } catch (e) {
        // ignore
      }
    }
  };

  const isSuperAdmin = role === "super_admin" || user?.email?.toLowerCase() === "bdinfosky@gmail.com";

  const canAccess = useCallback((pathname: string) => {
    if (isSuperAdmin || (role as string) === "super_admin" || user?.email?.toLowerCase() === "bdinfosky@gmail.com") {
      return true;
    }
    const effectiveRole = role || (user ? "admin" : null);
    return canAccessAdminRoute(effectiveRole, pathname, user?.email);
  }, [isSuperAdmin, role, user]);

  return {
    user,
    session,
    loading,
    isAdmin,
    role,
    isSuperAdmin,
    canAccess,
    signIn,
    signOut,
  };
}
