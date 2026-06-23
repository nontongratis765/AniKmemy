import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Search, Crown, Sparkles, ChevronRight, Flame, MessageCircle, Download, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser, useMyProfile, useMyRole, xpToLevel, isPremium } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar, UserName } from "@/components/user-badge";
import { animeApi, pickPoster, pickId } from "@/lib/anime-api";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import anikmeIcon from "@/assets/anikme-icon.png.asset.json";

export const Route = createFileRoute("/")({
  ssr: false,
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useSessionUser();
  const navigate = useNavigate();
  const pwa = usePwaInstall();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const { data: me } = useMyProfile();
  const { data: role } = useMyRole();

  const { data: topUsers } = useQuery({
    queryKey: ["top-xp"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,user_number,display_name,avatar_url,tag,xp").order("xp", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const { data: latestChat } = useQuery({
    queryKey: ["latest-chat"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("id,content,user_id,created_at").order("created_at", { ascending: false }).limit(1);
      if (!data?.[0]) return null;
      const { data: prof } = await supabase.from("profiles").select("display_name,avatar_url,user_number,tag").eq("id", data[0].user_id).maybeSingle();
      return { ...data[0], profile: prof };
    },
    refetchInterval: 15000,
  });

  const { data: history } = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("watch_history").select("*").eq("user_id", user!.id).order("watched_at", { ascending: false }).limit(4);
      return data ?? [];
    },
  });

  const { data: unread } = useQuery({
    queryKey: ["unread-notif", user?.id],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: notifs } = await supabase.from("notifications").select("id");
      const { data: reads } = await supabase.from("notification_reads").select("notification_id").eq("user_id", user!.id);
      const readSet = new Set((reads ?? []).map(r => r.notification_id));
      return (notifs ?? []).filter(n => !readSet.has(n.id)).length;
    },
  });

  const { data: recommendations } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      try {
        const j: any = await animeApi.ongoing(1);
        const list = j?.data?.animeList || j?.data?.animes || j?.data || [];
        return Array.isArray(list) ? list.slice(0, 8) : [];
      } catch { return []; }
    },
    staleTime: 5 * 60_000,
  });

  if (!user || !me) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat...</div>;
  }
  const level = xpToLevel(me.xp);

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/profile/$num" params={{ num: String(me.user_number) }} className="flex items-center gap-3 min-w-0">
          <Avatar url={me.avatar_url} name={me.display_name} size={48} />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <UserName name={me.display_name} tag={me.tag} userNumber={me.user_number} role={role} premium={isPremium(me)} link={false} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-accent px-2 py-0.5">📦 Lvl. {level}</span>
              <span className="rounded-full bg-accent px-2 py-0.5">#{me.user_number}</span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-accent">
            <Bell className="h-5 w-5" />
            {!!unread && unread > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{unread > 99 ? "99+" : unread}</span>
            )}
          </Link>
          <Link to="/anime" className="grid h-10 w-10 place-items-center rounded-full bg-accent">
            <Search className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="space-y-4 px-4">
        {/* Premium card */}
        <Link to="/premium" className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-yellow-900/40 to-amber-700/20 p-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-yellow-500 text-background"><Crown className="h-7 w-7" /></div>
          <div className="flex-1">
            <h3 className="font-bold shiny-gold">AniKme Premium</h3>
            <p className="text-xs text-muted-foreground">Hanya Rp5.000 — nama emas berkilau</p>
            <span className="mt-2 inline-block rounded-full bg-yellow-500 px-4 py-1.5 text-xs font-bold text-background">BELI PREMIUM</span>
          </div>
        </Link>

        {/* Install PWA + Join Community */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { if (pwa.canInstall) pwa.install(); }}
            disabled={pwa.installed}
            className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br from-purple-700/40 to-purple-900/40 p-3 text-center disabled:opacity-60"
          >
            <img src={anikmeIcon.url} alt="AniKme" className="h-10 w-10 rounded-xl" />
            <span className="text-xs font-bold">{pwa.installed ? "Terinstall ✓" : "Install Aplikasi"}</span>
            <span className="text-[10px] text-muted-foreground">
              {pwa.installed ? "Buka dari home" : pwa.canInstall ? "Add to Home Screen" : "Tap menu browser → Install"}
            </span>
          </button>
          <a
            href="https://chat.whatsapp.com/Cxz5o2o6WdvDBKQRjZW6Im"
            target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br from-emerald-700/40 to-emerald-900/40 p-3 text-center"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-background"><Users className="h-5 w-5" /></div>
            <span className="text-xs font-bold">Komunitas AniKme</span>
            <span className="text-[10px] text-muted-foreground">Join grup WhatsApp</span>
          </a>
        </div>



        {/* Top XP users */}
        <div className="rounded-3xl bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-premium">
            <Crown className="h-4 w-4" /> Top Users
          </div>
          <div className="mb-3 flex items-end justify-center gap-3">
            {[topUsers?.[1], topUsers?.[0], topUsers?.[2]].map((u, i) => u && (
              <Link key={u.id} to="/profile/$num" params={{ num: String(u.user_number) }} className="flex flex-col items-center">
                {i === 1 && <Crown className="h-4 w-4 text-premium" />}
                <Avatar url={u.avatar_url} name={u.display_name} size={i === 1 ? 64 : 48} />
                <span className="mt-1 text-xs">{u.display_name.slice(0, 10)}</span>
              </Link>
            ))}
          </div>
          <div className="space-y-1.5">
            {(topUsers ?? []).map((u, i) => (
              <Link key={u.id} to="/profile/$num" params={{ num: String(u.user_number) }} className="flex items-center gap-2 rounded-xl bg-accent/50 px-3 py-2 text-sm">
                <Avatar url={u.avatar_url} name={u.display_name} size={24} />
                <span className="font-bold text-premium">#{i + 1}</span>
                <span className="flex-1 truncate">{u.display_name}{u.tag && <span className="ml-1 text-brand">[{u.tag}]</span>}</span>
                <span className="font-bold text-brand">{u.xp} XP</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest chat preview (small) */}
        {latestChat && latestChat.profile && (
          <Link to="/chat" className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm">
            <Avatar url={latestChat.profile.avatar_url} name={latestChat.profile.display_name} size={24} />
            <span className="truncate text-xs">
              <span className="font-bold">{latestChat.profile.display_name}:</span>{" "}
              <span className="text-muted-foreground">{latestChat.content}</span>
            </span>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        {/* Rekomendasi Anime */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Flame className="h-5 w-5 text-brand" /> Rekomendasi Anime
            </h2>
            <Link to="/anime" className="text-sm text-brand">Selengkapnya ›</Link>
          </div>
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex gap-3 pb-2">
              {(recommendations ?? []).map((a: any, i: number) => {
                const slug = pickId(a);
                const poster = pickPoster(a);
                if (!slug) return null;
                return (
                  <Link
                    key={slug + i}
                    to="/watch/$id"
                    params={{ id: slug }}
                    className="w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-card"
                  >
                    {poster ? (
                      <img src={poster} alt={a.title} className="h-44 w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-44 w-full bg-accent" />
                    )}
                    <div className="p-2">
                      <div className="line-clamp-2 text-xs font-bold">{a.title}</div>
                      {a.episodes && <div className="mt-0.5 text-[10px] text-muted-foreground">Ep {a.episodes}</div>}
                    </div>
                  </Link>
                );
              })}
              {(!recommendations || recommendations.length === 0) && (
                <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground">Memuat rekomendasi...</div>
              )}
            </div>
          </div>
        </div>

        {/* History */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-black">Terakhir Ditonton</h2>
            <Link to="/history" className="text-sm text-brand">Selengkapnya ›</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(history ?? []).map((h) => (
              <div key={h.id} className="overflow-hidden rounded-2xl bg-card">
                {h.cover_url ? <img src={h.cover_url} alt={h.anime_title} className="h-32 w-full object-cover" /> : <div className="h-32 bg-accent" />}
                <div className="p-2 text-xs">
                  <div className="truncate font-bold">{h.anime_title}</div>
                  {h.episode && <div className="text-muted-foreground">{h.episode}</div>}
                </div>
              </div>
            ))}
            {(!history || history.length === 0) && (
              <div className="col-span-2 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
                Belum ada tontonan. <Link to="/anime" className="text-brand">Jelajahi anime →</Link>
              </div>
            )}
          </div>
        </div>

        {role && (role === "owner" || role === "admin") && (
          <Link to="/admin" className="flex items-center justify-between rounded-3xl bg-destructive/20 p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-bold">Panel {role === "owner" ? "Owner" : "Admin"}</h3>
                <p className="text-xs text-muted-foreground">Kelola user, ban, notifikasi</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Link>
        )}
      </div>

      {/* Floating Chat FAB */}
      <Link
        to="/chat"
        aria-label="Chat Public"
        className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand text-background shadow-lg shadow-brand/30 active:scale-95"
      >
        <MessageCircle className="h-6 w-6" />
      </Link>
    </AppShell>
  );
}
