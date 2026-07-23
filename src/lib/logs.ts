import type { SupabaseClient, User } from "@supabase/supabase-js";

// Fire-and-forget audit trail for admin mutations. Logging must never break
// the mutation it's describing, so failures are swallowed.
export async function logActivity(
  supabase: SupabaseClient,
  user: User,
  category: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("activity_logs").insert({
      actor_id: user.id,
      actor_email: user.email,
      category,
      action,
      details: details ?? null,
    });
  } catch {
    // Best-effort only.
  }
}
