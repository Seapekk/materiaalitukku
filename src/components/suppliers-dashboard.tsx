"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCountryFlag } from "@/lib/country";
import { EU_COUNTRY_CODES } from "@/lib/eu-countries";
import { regionName } from "@/lib/kuljetus-constants";
import { getLifecycleStatus, type LifecycleStatus } from "@/lib/lifecycle";
import { LifecycleBadge } from "@/components/lifecycle-badge";
import type { Registration, Supplier } from "@/lib/types";
import {
  approveSupplierRegistration,
  createSupplier,
  deleteSupplier,
  reactivateSupplier,
  rejectSupplier,
  rejectSupplierRegistration,
  renewSupplier,
  updateSupplier,
  type SupActionState,
  type SupplierInput,
} from "@/app/[locale]/admin/suppliers/actions";

type Row = Supplier & { offerCount: number };

const STATUS_LABEL: Record<string, string> = {
  all: "All",
  active: "Active",
  expired: "Expired",
  rejected: "Rejected",
};

const EMPTY_FORM: SupplierInput = {
  name: "",
  country: "fi",
  email: "",
  phone: "",
  website: "",
  address: "",
  social: "",
  leadTime: "",
  description: "",
};

export function SuppliersDashboard({
  suppliers,
  registrations,
}: {
  suppliers: Row[];
  registrations: Registration[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | LifecycleStatus>("all");
  const [countryFilter, setCountryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<SupplierInput>(EMPTY_FORM);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (statusFilter !== "all" && getLifecycleStatus(s) !== statusFilter) return false;
      if (countryFilter && s.country !== countryFilter) return false;
      if (q && !s.name.toLowerCase().includes(q) && !(s.email ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [suppliers, statusFilter, countryFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: suppliers.length, active: 0, expired: 0, rejected: 0 };
    for (const s of suppliers) c[getLifecycleStatus(s)]++;
    return c;
  }, [suppliers]);

  const handleResult = (res: SupActionState, msg: string) => {
    if (res.error) setNotice("Something went wrong. Please try again.");
    else {
      setNotice(msg);
      router.refresh();
    }
  };

  const startEdit = (s?: Row) => {
    if (s) {
      setEditingId(s.id);
      setForm({
        name: s.name,
        country: s.country,
        email: s.email ?? "",
        phone: s.phone ?? "",
        website: s.website ?? "",
        address: s.address ?? "",
        social: s.social ?? "",
        leadTime: s.lead_time ?? "",
        description: s.description ?? "",
      });
    } else {
      setEditingId("new");
      setForm(EMPTY_FORM);
    }
    setNotice(null);
  };

  const submitForm = () => {
    if (!form.name.trim()) return;
    const data: SupplierInput = {
      name: form.name.trim(),
      country: form.country,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      website: form.website?.trim() || null,
      address: form.address?.trim() || null,
      social: form.social?.trim() || null,
      leadTime: form.leadTime?.trim() || null,
      description: form.description?.trim() || null,
    };
    startTransition(async () => {
      const res =
        editingId === "new"
          ? await createSupplier(data)
          : await updateSupplier(editingId as string, data);
      handleResult(res, "Saved.");
      if (!res.error) setEditingId(null);
    });
  };

  const handleDelete = (s: Row) => {
    const warning =
      s.offerCount > 0
        ? `Business "${s.name}" has ${s.offerCount} product${s.offerCount === 1 ? "" : "s"} that will also be removed. Delete anyway?`
        : `Permanently delete business "${s.name}"?`;
    if (!confirm(warning)) return;
    startTransition(async () => {
      const res = await deleteSupplier(s.id);
      handleResult(res, "Deleted.");
    });
  };

  const handleReject = (s: Row) => {
    const reason =
      prompt(`Rejection reason for business "${s.name}" (visible to admin only):`) ?? "";
    startTransition(async () => {
      const res = await rejectSupplier(s.id, reason);
      handleResult(res, "Saved.");
    });
  };

  const offerCountLabel = (n: number) =>
    n === 0 ? "no products" : `${n} product${n === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4">
      {registrations.length > 0 && (
        <div className="admin-card space-y-3 border-amber-200 bg-amber-50/60 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pending registrations ({registrations.length})
          </h2>
          <ul className="space-y-2">
            {registrations.map((reg) => (
              <li
                key={reg.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{reg.company_name}</p>
                  <p className="text-xs text-slate-500">
                    {reg.email} {reg.phone && `· ${reg.phone}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await approveSupplierRegistration(reg.id);
                        handleResult(res, "Approved and published.");
                      })
                    }
                    className="admin-btn admin-btn-primary"
                  >
                    Approve
                  </button>
                  <button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await rejectSupplierRegistration(reg.id);
                        handleResult(res, "Saved.");
                      })
                    }
                    className="admin-btn admin-btn-danger"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        {(["all", "active", "expired", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {STATUS_LABEL[s]} ({counts[s]})
          </button>
        ))}
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="admin-input h-9 w-44 cursor-pointer"
        >
          <option value="">All countries</option>
          {EU_COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {getCountryFlag(c)} {regionName(c, "en")}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="admin-input h-9 w-44"
        />
        <button
          onClick={() => startEdit()}
          className="admin-btn admin-btn-primary ml-auto"
        >
          + Add business
        </button>
      </div>

      {notice && (
        <p className="admin-card border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      {editingId && (
        <div className="admin-card space-y-3 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {editingId === "new" ? "Add business" : "Edit business"}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="admin-label">Company name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Country</label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="admin-input h-9 cursor-pointer"
              >
                {EU_COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {getCountryFlag(c)} {regionName(c, "en")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="admin-label">Email</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Phone</label>
              <input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Website</label>
              <input
                value={form.website ?? ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Address</label>
              <input
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Social</label>
              <input
                value={form.social ?? ""}
                onChange={(e) => setForm({ ...form, social: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Lead time</label>
              <input
                value={form.leadTime ?? ""}
                onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
                className="admin-input h-9"
                placeholder="e.g. 3–5 business days"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="admin-label">Description</label>
              <textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="admin-input"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending || !form.name.trim()}
              onClick={submitForm}
              className="admin-btn admin-btn-primary"
            >
              Save
            </button>
            <button onClick={() => setEditingId(null)} className="admin-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">No businesses yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Contact</th>
                <th>Products</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const status = getLifecycleStatus(s);
                return (
                  <tr key={s.id}>
                    <td className="font-medium text-slate-900">
                      {getCountryFlag(s.country)} {s.name}
                    </td>
                    <td className="text-xs text-slate-500">
                      {s.email}
                      {s.phone && <> · {s.phone}</>}
                    </td>
                    <td>{offerCountLabel(s.offerCount)}</td>
                    <td>
                      <LifecycleBadge row={s} rejectionReason={s.rejection_reason} />
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(s)}
                          className="admin-btn px-2 py-1"
                        >
                          Edit
                        </button>
                        {status !== "rejected" ? (
                          <button
                            disabled={pending}
                            onClick={() => handleReject(s)}
                            className="admin-btn px-2 py-1"
                          >
                            Reject
                          </button>
                        ) : (
                          <button
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const res = await reactivateSupplier(s.id);
                                handleResult(res, "Saved.");
                              })
                            }
                            className="admin-btn px-2 py-1"
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await renewSupplier(s.id);
                              handleResult(res, "Saved.");
                            })
                          }
                          className="admin-btn px-2 py-1"
                        >
                          Renew
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => handleDelete(s)}
                          className="admin-btn admin-btn-danger px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
