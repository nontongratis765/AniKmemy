import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  user_number: number;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  tag: string | null;
  is_private: boolean;
  xp: number;
  watch_minutes: number;
  email: string | null;
  premium_until: string | null;
  created_at: string;
};

export type Role = "owner" | "admin" | "member";

export function isPremium(p?: { premium_until?: string | null } | null) {
  return !!p?.premium_until && new Date(p.premium_until).getTime() > Date.now();
}


export function xpToLevel(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 10)) + 1);
}

export function useSessionUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

export function useMyProfile() {
  const { user } = useSessionUser();
  return useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useMyRole() {
  const { user } = useSessionUser();
  return useQuery({
    queryKey: ["my-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      const roles = (data ?? []).map((r) => r.role as Role);
      if (roles.includes("owner")) return "owner" as Role;
      if (roles.includes("admin")) return "admin" as Role;
      return "member" as Role;
    },
  });
}

export function useMyBan() {
  const { user } = useSessionUser();
  return useQuery({
    queryKey: ["my-ban", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("bans")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const ban = data?.[0];
      if (!ban) return null;
      if (ban.expires_at && new Date(ban.expires_at) < new Date()) return null;
      return ban;
    },
  });
}
