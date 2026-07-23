import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCountryFlag } from "@/lib/country";
import type { Registration, Submission } from "@/lib/types";
import { ApproveSubmissionForm } from "@/components/approve-submission-form";
import { DashboardStats } from "@/components/dashboard-stats";
import { getDashboardStats } from "@/lib/dashboard-stats";
import {
  approvePriceChange,
  approveSubmission,
  exportBackup,
  markRegistrationDone,
  rejectPriceChange,
  rejectSubmission,
  setImageVerification,
} from "./actions";

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

export const metadata: Metadata = { title: "Admin — Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Auth is already gated by the /admin layout; this page only needs data.
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at");

  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("read", false);

  const { data: priceRequestsRaw } = await supabase
    .from("price_change_requests")
    .select(
      "id, supplier_email, new_unit_price, created_at, offer:offers(id, unit_price, product:products(name, unit))"
    )
    .eq("status", "pending")
    .order("created_at");
  const priceRequests = (priceRequestsRaw ?? []) as unknown as PriceRequestRow[];

  // Supplier/transport registrations are approved from their own tabs
  // (/admin/suppliers, /admin/transport) — only "product" packages land here.
  const { data: registrationsRaw } = await supabase
    .from("registrations")
    .select("*")
    .eq("status", "pending")
    .eq("reg_type", "product")
    .order("created_at");
  const registrations = (registrationsRaw ?? []) as Registration[];

  const { data: productNamesRaw } = await supabase
    .from("products")
    .select("id, name, unit")
    .order("name");
  const productNames = productNamesRaw ?? [];

  const stats = await getDashboardStats(supabase);

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Dashboard</h1>
        <p className="admin-sub">
          Review incoming submissions, price changes and registrations. Approving
          a submission matches the business by email and links its offer to a
          product name.
        </p>
      </header>

      <DashboardStats
        stats={stats}
        exportBackup={exportBackup}
        setImageVerification={setImageVerification}
      />

      {priceRequests.length > 0 && (
        <section className="mb-8">
          <h2 className="admin-section-title">
            Price change requests ({priceRequests.length})
          </h2>
          <div className="admin-card overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Business email</th>
                  <th>Current</th>
                  <th>Requested</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {priceRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="font-medium text-slate-900">
                      {req.offer?.product?.name ?? "?"}
                    </td>
                    <td>{req.supplier_email}</td>
                    <td>{req.offer?.unit_price.toFixed(2)} €</td>
                    <td className="font-medium text-brand">
                      {req.new_unit_price.toFixed(2)} €/{req.offer?.product?.unit}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <form action={approvePriceChange}>
                          <input type="hidden" name="id" value={req.id} />
                          <button className="admin-btn admin-btn-primary">
                            Approve
                          </button>
                        </form>
                        <form action={rejectPriceChange}>
                          <input type="hidden" name="id" value={req.id} />
                          <button className="admin-btn admin-btn-danger">
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {registrations.length > 0 && (
        <section className="mb-8">
          <h2 className="admin-section-title">
            Partner registrations ({registrations.length})
          </h2>
          <div className="admin-card divide-y divide-slate-100">
            {registrations.map((reg) => (
              <div key={reg.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {reg.company_name}{" "}
                      <span className="admin-pill bg-slate-100 text-slate-600">
                        {reg.reg_type === "product"
                          ? "Product package"
                          : reg.reg_type === "supplier"
                            ? "Supplier package"
                            : "Route package"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {reg.email}
                      {reg.phone && <span> · {reg.phone}</span>}
                      {" · "}
                      {new Date(reg.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <form action={markRegistrationDone}>
                    <input type="hidden" name="id" value={reg.id} />
                    <button className="admin-btn">Mark as handled</button>
                  </form>
                </div>
                {typeof reg.payload?.details === "string" && reg.payload.details && (
                  <p className="mt-2 whitespace-pre-wrap border-t border-slate-100 pt-2 text-sm text-slate-600">
                    {reg.payload.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {(unreadMessages ?? 0) > 0 && (
        <Link
          href="/admin/messages"
          className="admin-card mb-8 flex items-center justify-between gap-3 p-3 hover:bg-slate-50"
        >
          <span className="text-sm font-medium text-slate-700">
            {unreadMessages} unread message{unreadMessages === 1 ? "" : "s"}
          </span>
          <span className="text-sm text-brand">View →</span>
        </Link>
      )}

      <section>
        <h2 className="admin-section-title">
          Pending product submissions ({pending?.length ?? 0})
        </h2>
        {pending && pending.length > 0 ? (
          <div className="admin-card divide-y divide-slate-100">
            {pending.map((sub: Submission) => (
              <div key={sub.id} className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{sub.raw_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {getCountryFlag(sub.supplier_country)} {sub.supplier_name} (
                      {sub.supplier_email})
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="font-medium text-brand">
                        {sub.raw_unit_price.toFixed(2)} €/{sub.raw_unit}
                      </span>
                      {sub.raw_wholesale_price != null && (
                        <>
                          {" "}
                          · {sub.raw_wholesale_price.toFixed(2)} € ≥{" "}
                          {sub.raw_min_wholesale_qty ?? "?"}
                        </>
                      )}
                      {sub.raw_transport_small != null && (
                        <> · freight {sub.raw_transport_small.toFixed(2)} €</>
                      )}
                      {sub.raw_transport_bulk != null && (
                        <> / {sub.raw_transport_bulk.toFixed(2)} €</>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <ApproveSubmissionForm
                      submissionId={sub.id}
                      rawName={sub.raw_name}
                      products={productNames}
                      approveAction={approveSubmission}
                    />
                    <form action={rejectSubmission}>
                      <input type="hidden" name="id" value={sub.id} />
                      <button className="admin-btn admin-btn-danger">Reject</button>
                    </form>
                  </div>
                </div>
                {sub.raw_description && (
                  <p className="mt-2 whitespace-pre-wrap border-t border-slate-100 pt-2 text-sm text-slate-600">
                    {sub.raw_description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-card p-10 text-center text-sm text-slate-400">
            Nothing waiting for review.
          </div>
        )}
      </section>
    </div>
  );
}
