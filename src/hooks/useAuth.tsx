import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  organization_id: string;
  nombre: string;
  email: string | null;
}

export type PlanTier = "free" | "basico" | "profesional" | "enterprise";
export type AppRole = "admin" | "trabajador" | "super_admin";

interface OrganizationInfo {
  id: string;
  nombre: string;
  plan: PlanTier;
  plan_expira_en: string | null;
  plan_gratis_trial: boolean;
  nombre_bioterio: string | null;
  logo_url: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  organization: OrganizationInfo | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
        setOrganization(null);
        setIsSuperAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile(prof as Profile | null);

    const rs = (roles ?? []).map((r: any) => r.role as AppRole);
    const superAdmin = rs.includes("super_admin");
    setIsSuperAdmin(superAdmin);
    // Pick highest precedence role for `role`
    const r: AppRole | null = superAdmin
      ? "super_admin"
      : rs.includes("admin")
      ? "admin"
      : rs.includes("trabajador")
      ? "trabajador"
      : null;
    setRole(r);

    if (prof?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, nombre, plan, plan_expira_en, plan_gratis_trial, nombre_bioterio")
        .eq("id", prof.organization_id)
        .maybeSingle();
      setOrganization((org as OrganizationInfo | null) ?? null);
    } else {
      setOrganization(null);
    }
    setLoading(false);
  };

  const refreshOrganization = async () => {
    if (!profile?.organization_id) return;
    const { data: org } = await supabase
      .from("organizations")
      .select("id, nombre, plan, plan_expira_en, plan_gratis_trial, nombre_bioterio")
      .eq("id", profile.organization_id)
      .maybeSingle();
    setOrganization((org as OrganizationInfo | null) ?? null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
    setOrganization(null);
    setIsSuperAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, role, organization, isSuperAdmin, loading, signOut, refreshOrganization }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
