import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCountryFlag } from "@/lib/country";
import type { Message, Submission } from "@/lib/types";
import {
  approvePriceChange,
  approveSubmission,
  markMessageRead,
  markRegistrationDone,
  rejectPriceChange,
  rejectSubmission,
} from "./actions";

type RegistrationRow = {
  id: string;
  reg_type: "product" | "supplier" | "transport";
  company_name: string;
  email: string;
  phone: string | null;
  payload: { details?: string };
  created_at: string;
};

type PriceRequestRow = {
  id: string;
  supplier_email: string;
  new_unit_price: number;
  created_at: string;
  offer: {
    id: string;
    unit_price: number;
    product: { name: string; unit: string } | null;
  } | null;
};

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

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

  const { data: pending } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at");

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("read", false)
    .order("created_at", { ascending: false });

  const { data: priceRequestsRaw } = await supabase
    .from("price_change_requests")
    .select(
      "id, supplier_email, new_unit_price, created_at, offer:offers(id, unit_price, product:products(name, unit))"
    )
    .eq("status", "pending")
    .order("created_at");
  const priceRequests = (priceRequestsRaw ?? []) as unknown as PriceRequestRow[];

  const { data: registrationsRaw } = await supabase
    .from("registrations")
    .select("*")
    .eq("status", "pending")
    .order("created_at");
  const registrations = (registrationsRaw ?? []) as RegistrationRow[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 space-y-2 border-2 border-black bg-black p-8 text-white">
        <span className="inline-block bg-white px-2 py-0.5 font-mono text-xs font-bold uppercase text-[#991B1B]">
          Admin / Control
        </span>
        <h1 className="font-mono text-2xl font-black uppercase md:text-3xl">
          {t("title")}
        </h1>
        <p className="text-sm text-gray-300">{t("approveNote")}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="border-2 border-white bg-white px-3 py-1.5 font-mono text-xs font-black uppercase text-black">
            📥 {t("submissionsTab")} ({pending?.length ?? 0})
          </span>
          <Link
            href="/admin/translations"
            className="border-2 border-white bg-black px-3 py-1.5 font-mono text-xs font-black uppercase text-white hover:bg-[#1450A3]"
          >
            🌍 {t("translations")}
          </Link>
        </div>
      </div>

      {priceRequests.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-black">
            💶 {t("priceRequests")} ({priceRequests.length})
          </h2>
          <ul className="space-y-4">
            {priceRequests.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div>
                  <p className="font-mono text-sm font-extrabold uppercase tracking-tight">
                    {req.offer?.product?.name ?? "?"}
                  </p>
                  <p className="mt-1 font-mono text-[11px] font-bold uppercase text-gray-500">
                    {req.supplier_email}
                  </p>
                  <p className="mt-1 font-mono text-sm">
                    {t("currentPrice")}:{" "}
                    <span className="text-stone-600">
                      {req.offer?.unit_price.toFixed(2)} €
                    </span>{" "}
                    → {t("newPrice")}:{" "}
                    <strong className="text-[#1450A3]">
                      {req.new_unit_price.toFixed(2)} €/
                      {req.offer?.product?.unit}
                    </strong>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approvePriceChange}>
                    <input type="hidden" name="id" value={req.id} />
                    <button className="btn-brutal bg-[#10B981] px-3 py-1.5 text-white hover:bg-[#059669]">
                      {t("approve")}
                    </button>
                  </form>
                  <form action={rejectPriceChange}>
                    <input type="hidden" name="id" value={req.id} />
                    <button className="btn-brutal bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">
                      {t("reject")}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {registrations.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-black">
            🤝 {t("registrations")} ({registrations.length})
          </h2>
          <ul className="space-y-4">
            {registrations.map((reg) => (
              <li
                key={reg.id}
                className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-extrabold uppercase tracking-tight">
                      {reg.company_name}{" "}
                      <span className="ml-2 border border-blue-400 bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-blue-800">
                        {reg.reg_type === "product"
                          ? t("regProduct")
                          : reg.reg_type === "supplier"
                            ? t("regSupplier")
                            : t("regTransport")}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-[11px] font-bold uppercase text-gray-500">
                      {reg.email}
                      {reg.phone && <span className="normal-case"> · {reg.phone}</span>}
                      {" · "}
                      {new Date(reg.created_at).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <form action={markRegistrationDone}>
                    <input type="hidden" name="id" value={reg.id} />
                    <button className="btn-brutal bg-white px-3 py-1.5 text-black hover:bg-stone-100">
                      {t("markDone")}
                    </button>
                  </form>
                </div>
                {reg.payload?.details && (
                  <p className="mt-2 whitespace-pre-wrap border-t-2 border-dashed border-gray-200 pt-2 text-sm text-stone-600">
                    {reg.payload.details}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {messages && messages.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-black">
            ✉️ {t("messages")} ({messages.length})
          </h2>
          <ul className="space-y-4">
            {messages.map((msg: Message) => (
              <li
                key={msg.id}
                className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-xs font-bold uppercase text-gray-500">
                    {msg.sender_email} ·{" "}
                    {new Date(msg.created_at).toLocaleDateString(locale)}
                  </p>
                  <form action={markMessageRead}>
                    <input type="hidden" name="id" value={msg.id} />
                    <button className="btn-brutal bg-white px-3 py-1.5 text-black hover:bg-stone-100">
                      {t("markRead")}
                    </button>
                  </form>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                  {msg.message}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending && pending.length > 0 ? (
        <section>
          <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-black">
            📥 {t("pendingSubmissions")} ({pending.length})
          </h2>
          <ul className="space-y-4">
            {pending.map((sub: Submission) => (
              <li
                key={sub.id}
                className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-extrabold uppercase tracking-tight">
                      {sub.raw_name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] font-bold uppercase text-gray-500">
                      {t("supplier")}: {getCountryFlag(sub.supplier_country)}{" "}
                      {sub.supplier_name}{" "}
                      <span className="normal-case">({sub.supplier_email})</span>
                    </p>
                    <p className="mt-1 font-mono text-sm text-stone-700">
                      {t("price")}:{" "}
                      <strong className="text-[#1450A3]">
                        {sub.raw_unit_price.toFixed(2)} €/{sub.raw_unit}
                      </strong>
                      {sub.raw_wholesale_price != null && (
                        <>
                          {" "}
                          · {sub.raw_wholesale_price.toFixed(2)} € ≥{" "}
                          {sub.raw_min_wholesale_qty ?? "?"}
                        </>
                      )}
                      {sub.raw_transport_small != null && (
                        <> · 🚚 {sub.raw_transport_small.toFixed(2)} €</>
                      )}
                      {sub.raw_transport_bulk != null && (
                        <> / {sub.raw_transport_bulk.toFixed(2)} €</>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={approveSubmission}>
                      <input type="hidden" name="id" value={sub.id} />
                      <button className="btn-brutal bg-[#10B981] px-3 py-1.5 text-white hover:bg-[#059669]">
                        {t("approve")}
                      </button>
                    </form>
                    <form action={rejectSubmission}>
                      <input type="hidden" name="id" value={sub.id} />
                      <button className="btn-brutal bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">
                        {t("reject")}
                      </button>
                    </form>
                  </div>
                </div>
                {sub.raw_description && (
                  <p className="mt-2 whitespace-pre-wrap border-t-2 border-dashed border-gray-200 pt-2 text-sm text-stone-600">
                    {sub.raw_description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="border-2 border-black bg-white p-16 text-center font-mono text-sm font-bold uppercase text-gray-500">
          {t("empty")}
        </p>
      )}
    </div>
  );
}
