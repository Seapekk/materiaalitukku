import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business, Tender } from "@/lib/types";
import { moderateBusiness, moderateTender } from "./actions";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

function ModerateButtons({
  id,
  action,
  approveLabel,
  rejectLabel,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  approveLabel: string;
  rejectLabel: string;
}) {
  return (
    <div className="flex gap-2 shrink-0">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button
          name="action"
          value="approve"
          className="bg-emerald-700 text-white rounded px-3 py-1.5 text-sm hover:bg-emerald-800 cursor-pointer"
        >
          {approveLabel}
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button
          name="action"
          value="reject"
          className="bg-red-600 text-white rounded px-3 py-1.5 text-sm hover:bg-red-700 cursor-pointer"
        >
          {rejectLabel}
        </button>
      </form>
    </div>
  );
}

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    redirect({ href: "/", locale });
    return null;
  }

  const [{ data: pendingTenders }, { data: pendingBusinesses }] =
    await Promise.all([
      supabase
        .from("tenders")
        .select("*")
        .eq("status", "pending")
        .order("created_at"),
      supabase
        .from("businesses")
        .select("*")
        .eq("status", "pending")
        .order("created_at"),
    ]);

  const nothingPending =
    (!pendingTenders || pendingTenders.length === 0) &&
    (!pendingBusinesses || pendingBusinesses.length === 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      {nothingPending && <p className="text-slate-500">{t("empty")}</p>}

      {pendingTenders && pendingTenders.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">{t("pendingTenders")}</h2>
          <ul className="space-y-2">
            {pendingTenders.map((tender: Tender) => (
              <li
                key={tender.id}
                className="bg-white border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{tender.title}</p>
                    <p className="text-sm text-slate-500">
                      {tender.city}, {tender.country}
                      {tender.budget != null && <> · {tender.budget} €</>}
                    </p>
                  </div>
                  <ModerateButtons
                    id={tender.id}
                    action={moderateTender}
                    approveLabel={t("approve")}
                    rejectLabel={t("reject")}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                  {tender.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingBusinesses && pendingBusinesses.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">{t("pendingBusinesses")}</h2>
          <ul className="space-y-2">
            {pendingBusinesses.map((b: Business) => (
              <li
                key={b.id}
                className="bg-white border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-sm text-slate-500">
                      {b.city}, {b.country}
                      {b.email && <> · {b.email}</>}
                    </p>
                  </div>
                  <ModerateButtons
                    id={b.id}
                    action={moderateBusiness}
                    approveLabel={t("approve")}
                    rejectLabel={t("reject")}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                  {b.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
