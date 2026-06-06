import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  default_address: Record<string, any>;
  saved_addresses: Record<string, any>[];
}

interface CustomerContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<CustomerProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | null>(null);

const defaultContext: CustomerContextType = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
};

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  return ctx ?? defaultContext;
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, email?: string, fullName?: string) => {
    const { data } = await supabase
      .from("customer_profiles" as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setProfile(data as any);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Check if this is an admin user (has admin role) - don't set profile for admins
        setTimeout(() => fetchProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata?.full_name
        ), 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata?.full_name
        );
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: phone } },
    });
    if (!error && data?.user) {
      // Log registration activity
      await supabase
        .from("customer_activities" as any)
        .insert({
          user_id: data.user.id,
          email,
          phone,
          activity_type: "registration",
          user_agent: navigator.userAgent
        });
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      const { data: profile } = await supabase
        .from("customer_profiles" as any)
        .select("phone")
        .eq("user_id", data.user.id)
        .maybeSingle();

      // Log login activity
      await supabase
        .from("customer_activities" as any)
        .insert({
          user_id: data.user.id,
          email: data.user.email || email,
          phone: profile?.phone || null,
          activity_type: "login",
          user_agent: navigator.userAgent
        });
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (data: Partial<CustomerProfile>) => {
    if (!user) return;
    await supabase
      .from("customer_profiles" as any)
      .update(data)
      .eq("user_id", user.id);
    await fetchProfile(user.id);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <CustomerContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, updateProfile, refreshProfile }}>
      {children}
    </CustomerContext.Provider>
  );
}
