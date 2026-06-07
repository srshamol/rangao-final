import React, { useEffect, useState, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabaseAdmin } from "@/integrations/supabase/client";
import AppLoader from "@/components/AppLoader";

// Storage key for the admin session — must match client.ts storageKey
const STORAGE_KEY = "sb-rangao-auth-token";

/** Synchronously read access token from localStorage — no network needed */
function getLocalSession(): { userId: string; email: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.access_token || parsed?.session?.access_token;
    const userId = parsed?.user?.id || parsed?.session?.user?.id;
    const email = parsed?.user?.email || parsed?.session?.user?.email;
    const expiresAt = parsed?.expires_at || parsed?.session?.expires_at;
    // Check expiry (unix timestamp in seconds)
    if (!token || !userId || (expiresAt && expiresAt < Math.floor(Date.now() / 1000))) {
      return null;
    }
    return { userId, email };
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Fast sync check from localStorage before any async work
  const localSession = getLocalSession();

  const [loading, setLoading] = useState(!localSession); // skip loading if session already found
  const [authorized, setAuthorized] = useState(!!localSession); // optimistically authorize
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    // Push admin GTM event immediately if we had a local session
    if (localSession) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "admin_session", traffic_type: "internal" });
    }

    async function verifySession() {
      try {
        const { data: { session } } = await supabaseAdmin.auth.getSession();

        if (!active) return;

        if (!session) {
          // If we had a local session but server says no, check if it's just slow
          if (!localSession) {
            setRedirectPath("/admin/login");
            setLoading(false);
          }
          // If localSession was truthy, keep authorized — don't kick the user on network lag
          return;
        }

        // Session confirmed by server — check role
        const jwtRole = session.user?.app_metadata?.role as string | undefined;
        if (jwtRole === "admin" || jwtRole === "manager") {
          setAuthorized(true);
          setLoading(false);
          return;
        }

        // Non-blocking role check (doesn't affect the UI — user is already in)
        supabaseAdmin
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", session.user.id)
          .then(({ data: rows, error }) => {
            if (!active) return;
            if (error) {
              // RLS blocking or DB slow — trust the session (signIn already validated role)
              console.warn("Role verify skipped (DB error):", error.message);
              return;
            }
            const roles: string[] = (rows || []).map((r: any) => r.role as string);
            const hasAccess = roles.some(r => r === "admin" || r === "manager");
            if (!hasAccess) {
              // Valid session but no admin role — sign out and redirect
              supabaseAdmin.auth.signOut();
              setAuthorized(false);
              setRedirectPath("/");
            }
          });

        setAuthorized(true);
        setLoading(false);
      } catch (err) {
        console.error("Session verify error:", err);
        // On error, trust local session if it exists
        if (active && !localSession) {
          setRedirectPath("/admin/login");
          setLoading(false);
        }
      }
    }

    verifySession();

    // Listen for sign-out events
    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session) {
        setAuthorized(false);
        setRedirectPath("/admin/login");
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <AppLoader />;
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} state={{ from: location.pathname }} replace />;
  }

  if (!authorized) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return <Suspense fallback={<AppLoader />}>{children}</Suspense>;
}
