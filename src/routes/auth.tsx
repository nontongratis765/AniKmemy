import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import anikmeIcon from "@/assets/anikme-icon.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function signIn() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Gagal masuk: " + res.error.message); setLoading(false); return; }
    if (!res.redirected) navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <img src={anikmeIcon.url} alt="AniKme" className="mb-6 h-28 w-28 rounded-3xl shadow-2xl shadow-purple-900/40" />
      <h1 className="text-3xl font-black tracking-tight shiny-purple">AniKme</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Nonton anime sub indo + komunitas chat global, leveling, dan profil keren.
      </p>
      <button
        onClick={signIn}
        disabled={loading}
        className="mt-10 flex items-center gap-3 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-lg disabled:opacity-50"
      >
        <svg viewBox="0 0 48 48" className="h-5 w-5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.1 29.2 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 16.1 4.5 9.3 9.1 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5.1l-6-5.1C29 35 26.6 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.2 39 16 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.1-2.2 3.9-4.1 5.3l6 5.1c-.4.4 6.3-4.6 6.3-14.4 0-1.2-.1-2.3-.3-3.5z"/></svg>
        {loading ? "Memuat..." : "Masuk dengan Google"}
      </button>
      <p className="mt-6 text-xs text-muted-foreground">Dengan masuk, kamu setuju syarat & ketentuan AniKme.</p>
    </div>
  );
}
