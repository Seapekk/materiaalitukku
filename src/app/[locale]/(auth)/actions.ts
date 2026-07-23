"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

// Production admin sign-in (spec: materiaalitukku.com/sisene → round Google
// logo → Google auth). Requires the Google provider to be enabled in the
// Supabase dashboard; env NEXT_PUBLIC_SITE_URL overrides the derived origin.
export async function signInWithGoogle(): Promise<AuthState> {
  const supabase = await createClient();
  const locale = await getLocale();

  const hdrs = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${hdrs.get("x-forwarded-proto") ?? "http"}://${hdrs.get("host")}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=/${locale}/admin`,
    },
  });

  if (error || !data?.url) return { error: "oauthFailed" };
  nextRedirect(data.url);
  return {};
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    return { error: "invalidCredentials" };
  }

  revalidatePath("/", "layout");
  redirect({ href: "/admin", locale });
  return {};
}

export async function logout() {
  const supabase = await createClient();
  const locale = await getLocale();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect({ href: "/", locale });
}
