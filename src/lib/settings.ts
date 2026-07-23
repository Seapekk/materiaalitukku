import type { SupabaseClient } from "@supabase/supabase-js";

// Small key/value settings store (app_settings table). Values are plain strings.
export const IMAGE_VERIFICATION_KEY = "image_verification_enabled";

export async function getSetting(
  supabase: SupabaseClient,
  key: string
): Promise<string | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

export async function setSetting(
  supabase: SupabaseClient,
  key: string,
  value: string
): Promise<void> {
  await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
}

export async function isImageVerificationEnabled(
  supabase: SupabaseClient
): Promise<boolean> {
  return (await getSetting(supabase, IMAGE_VERIFICATION_KEY)) === "true";
}
