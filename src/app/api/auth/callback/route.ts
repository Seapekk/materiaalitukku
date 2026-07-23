import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) code-exchange endpoint. Supabase redirects the browser here
// with `?code=...` after the user authenticates; we swap it for a session and
// forward to `next` (defaults to the localized admin dashboard). Lives under
// /api so the next-intl middleware leaves the path untouched.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — bounce back to the Google login page.
  return NextResponse.redirect(`${origin}/sisene?error=auth`);
}
