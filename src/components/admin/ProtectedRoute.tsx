import React, { useEffect, useState, Suspense } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { supabaseAdmin } from "@/integrations/supabase/client";
import AppLoader from "@/components/AppLoader";
import { canAccessAdminRoute, ALL_STAFF_ROLES, ROLE_METADATA, type AppRole } from "@/lib/permissions";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Storage key for the admin session — must match client.ts storageKey
const STORAGE_KEY = "sb-rangao-auth-token";

/** Synchronously read access token from localStorage — no network needed */
function getLocalSession(): { userId: string; email: string; role?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.access_token || parsed?.session?.access_token;
    const userId = parsed?.user?.id || parsed?.session?.user?.id;
    const email = parsed?.user?.email || parsed?.session?.user?.email;
    let role = parsed?.user?.app_metadata?.role || parsed?.session?.user?.app_metadata?.role;
    if (email?.toLowerCase() === "bdinfosky@gmail.com") {
      role = "super_admin";
    }
    const expiresAt = parsed?.expires_at || parsed?.session?.expires_at;
    // Check expiry (unix timestamp in seconds)
    if (!token || !userId || (expiresAt && expiresAt < Math.floor(Date.now() / 1000))) {
      return null;
    }
    return { userId, email, role: role || (email ? "admin" : undefined) };
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Fast sync check from localStorage before any async work
  const localSession = getLocalSession();

  const [loading, setLoading] = useState(!localSession);
  const [authorized, setAuthorized] = useState(!!localSession);
  const [currentRole, setCurrentRole] = useState<string | null>(localSession?.role || null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    if (localSession) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "admin_session", traffic_type: "internal" });
    }

    async function verifySession() {
      try {
        const { data: { session } } = await supabaseAdmin.auth.getSession();

        if (!active) return;

        if (!session) {
          if (!localSession) {
            setRedirectPath("/admin/login");
            setLoading(false);
          }
          return;
        }

        const jwtRole = session.user?.app_metadata?.role as string | undefined;
        if (jwtRole && ALL_STAFF_ROLES.includes(jwtRole as AppRole)) {
          setCurrentRole(jwtRole);
          setAuthorized(true);
          setLoading(false);
          return;
        }

        // Database role check
        supabaseAdmin
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", session.user.id)
          .then(({ data: rows, error }) => {
            if (!active) return;
            if (error) {
              console.warn("Role verify skipped (DB error):", error.message);
              return;
            }
            const roles: string[] = (rows || []).map((r: any) => r.role as string);
            const matchedRole = roles.find(r => ALL_STAFF_ROLES.includes(r as AppRole));
            if (!matchedRole) {
              supabaseAdmin.auth.signOut();
              setAuthorized(false);
              setRedirectPath("/");
            } else {
              setCurrentRole(matchedRole);
            }
          });

        setAuthorized(true);
        setLoading(false);
      } catch (err) {
        console.error("Session verify error:", err);
        if (active && !localSession) {
          setRedirectPath("/admin/login");
          setLoading(false);
        }
      }
    }

    verifySession();

    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session) {
        setAuthorized(false);
        setCurrentRole(null);
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

  // Super Admin has full unrestricted access
  const isSuperAdminUser = currentRole === "super_admin" || localSession?.email?.toLowerCase() === "bdinfosky@gmail.com";
  if (isSuperAdminUser) {
    return <Suspense fallback={<AppLoader />}>{children}</Suspense>;
  }

  // Check route-level permission if role is determined
  if (currentRole && !canAccessAdminRoute(currentRole, location.pathname, localSession?.email)) {
    const roleMeta = ROLE_METADATA[currentRole as AppRole];
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center max-w-md mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold font-display text-foreground mb-2">অ্যাক্সেস সীমাবদ্ধ</h2>
        <p className="text-sm text-muted-foreground mb-4">
          আপনার বর্তমান রোল ({roleMeta?.bn || currentRole}) এই পেজটি দেখার জন্য অনুমোদিত নয়।
        </p>
        <Button asChild variant="outline" className="rounded-xl gap-2">
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4" /> ড্যাশবোর্ডে ফিরুন
          </Link>
        </Button>
      </div>
    );
  }

  return <Suspense fallback={<AppLoader />}>{children}</Suspense>;
}
