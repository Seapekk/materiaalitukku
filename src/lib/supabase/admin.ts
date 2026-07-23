import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminCtx = { supabase: SupabaseClient; user: User };

type AdminLookup =
  | ({ ok: true } & AdminCtx)
  | { ok: false; reason: "unauthenticated" | "forbidden" };

async function loadAdminCtx(): Promise<AdminLookup> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, reason: "forbidden" };

  return { ok: true, supabase, user };
}

// For Server Components (layout.tsx/page.tsx): redirects non-admins away.
// Signed-out visitors go to /login, signed-in non-admins go to /.
export async function requireAdminPage(locale: string): Promise<AdminCtx> {
  const ctx = await loadAdminCtx();
  if (!ctx.ok) {
    redirect({ href: ctx.reason === "unauthenticated" ? "/login" : "/", locale });
    throw new Error("unreachable");
  }
  return ctx;
}

// For "use server" action files: never redirects, callers no-op on null.
export async function requireAdminAction(): Promise<AdminCtx | null> {
  const ctx = await loadAdminCtx();
  return ctx.ok ? ctx : null;
}
