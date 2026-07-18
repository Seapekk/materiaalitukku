import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { LanguageSwitcher } from "./language-switcher";
import { logout } from "@/app/[locale]/(auth)/actions";

export async function Header() {
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold text-emerald-700">
          Materiaalitukku
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link href="/products" className="px-2 sm:px-3 py-2 rounded hover:bg-slate-100">
            {t("products")}
          </Link>
          <Link href="/suppliers" className="hidden sm:block px-2 sm:px-3 py-2 rounded hover:bg-slate-100">
            {t("suppliers")}
          </Link>
          <Link href="/transport" className="hidden sm:block px-2 sm:px-3 py-2 rounded hover:bg-slate-100">
            {t("transport")}
          </Link>
          <Link
            href="/submit"
            className="px-3 py-2 rounded bg-emerald-700 text-white hover:bg-emerald-800"
          >
            {t("submit")}
          </Link>
          {isAdmin && (
            <Link href="/admin" className="px-2 sm:px-3 py-2 rounded hover:bg-slate-100">
              {t("admin")}
            </Link>
          )}
          {user && (
            <form action={logout}>
              <button className="px-2 sm:px-3 py-2 rounded hover:bg-slate-100 cursor-pointer">
                {t("logout")}
              </button>
            </form>
          )}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
