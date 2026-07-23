"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCountryFlag } from "@/lib/country";
import { EU_COUNTRY_CODES } from "@/lib/eu-countries";
import { regionName } from "@/lib/kuljetus-constants";
import { getLifecycleStatus, type LifecycleStatus } from "@/lib/lifecycle";
import { LifecycleBadge } from "@/components/lifecycle-badge";
import { formatRoute, type Registration, type RouteDirection, type TransportCompany } from "@/lib/types";
import {
  approveTransportRegistration,
  createTransport,
  deleteTransport,
  reactivateTransport,
  rejectTransport,
  rejectTransportRegistration,
  renewTransport,
  updateTransport,
  type TransportActionState,
  type TransportInput,
} from "@/app/[locale]/admin/transport/actions";

// `key` is the value persisted in the DB (and used by the public transport
// page) — do not change it. `label` is the English text shown to the admin.
const SERVICE_OPTIONS = [
  { key: "FTL (Täysikuorma)", label: "FTL (full load)", priceField: "ftlPrice" as const },
  { key: "LTL (Osakuorma)", label: "LTL (part load)", priceField: "ltlPrice" as const },
  { key: "Pikakuljetus", label: "Express", priceField: "expressPrice" as const },
  { key: "Lämpösäädelty", label: "Temperature-controlled", priceField: null },
  { key: "Nosturikuljetus", label: "Crane transport", priceField: null },
  { key: "Erikoiskuljetus", label: "Special transport", priceField: null },
];
const SERVICE_LABEL: Record<string, string> = Object.fromEntries(
  SERVICE_OPTIONS.map((s) => [s.key, s.label])
);
const serviceLabels = (keys: string[]) =>
  keys.map((k) => SERVICE_LABEL[k] ?? k).join(", ");

const DIRECTION_LABEL: Record<RouteDirection, string> = {
  inbound: "Inbound to Finland",
  outbound: "Outbound from Finland",
  roundtrip: "Both directions",
};
const DIRECTIONS: RouteDirection[] = ["inbound", "outbound", "roundtrip"];

const STATUS_LABEL: Record<string, string> = {
  all: "All",
  active: "Active",
  expired: "Expired",
  rejected: "Rejected",
};

const EMPTY_FORM: TransportInput = {
  name: "",
  originCountry: "ee",
  direction: "inbound",
  services: [],
  ftlPrice: null,
  ltlPrice: null,
  expressPrice: null,
  capacity: "",
  days: "",
  email: "",
  phone: "",
  website: "",
  description: "",
};

export function TransportDashboard({
  companies,
  registrations,
}: {
  companies: TransportCompany[];
  registrations: Registration[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | LifecycleStatus>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<TransportInput>(EMPTY_FORM);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (statusFilter !== "all" && getLifecycleStatus(c) !== statusFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [companies, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: companies.length, active: 0, expired: 0, rejected: 0 };
    for (const tc of companies) c[getLifecycleStatus(tc)]++;
    return c;
  }, [companies]);

  const handleResult = (res: TransportActionState, msg: string) => {
    if (res.error)
      setNotice(
        res.error === "noServices"
          ? "Select at least one service."
          : "Something went wrong. Please try again."
      );
    else {
      setNotice(msg);
      router.refresh();
    }
  };

  const startEdit = (c?: TransportCompany) => {
    if (c) {
      setEditingId(c.id);
      setForm({
        name: c.name,
        originCountry: c.origin_country,
        direction: c.direction,
        services: c.services,
        ftlPrice: c.ftl_price,
        ltlPrice: c.ltl_price,
        expressPrice: c.express_price,
        capacity: c.capacity ?? "",
        days: c.days,
        email: c.email ?? "",
        phone: c.phone ?? "",
        website: c.website ?? "",
        description: c.description ?? "",
      });
    } else {
      setEditingId("new");
      setForm(EMPTY_FORM);
    }
    setNotice(null);
  };

  const toggleService = (key: string) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(key)
        ? f.services.filter((s) => s !== key)
        : [...f.services, key],
    }));
  };

  const submitForm = () => {
    if (!form.name.trim() || form.services.length === 0) return;
    startTransition(async () => {
      const res =
        editingId === "new"
          ? await createTransport(form)
          : await updateTransport(editingId as string, form);
      handleResult(res, "Saved.");
      if (!res.error) setEditingId(null);
    });
  };

  const handleDelete = (c: TransportCompany) => {
    if (!confirm(`Permanently delete transport company "${c.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteTransport(c.id);
      handleResult(res, "Deleted.");
    });
  };

  const handleReject = (c: TransportCompany) => {
    const reason =
      prompt(`Rejection reason for company "${c.name}" (visible to admin only):`) ?? "";
    startTransition(async () => {
      const res = await rejectTransport(c.id, reason);
      handleResult(res, "Saved.");
    });
  };

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
                        const res = await approveTransportRegistration(reg.id);
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
                        const res = await rejectTransportRegistration(reg.id);
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
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company…"
          className="admin-input h-9 w-44"
        />
        <button
          onClick={() => startEdit()}
          className="admin-btn admin-btn-primary ml-auto"
        >
          + Add transport company
        </button>
      </div>

      {notice && (
        <p className="admin-card border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      {editingId && (
        <div className="admin-card space-y-4 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {editingId === "new" ? "Add transport company" : "Edit transport company"}
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="admin-label">Company name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="admin-input h-9"
              />
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
            <div className="space-y-1 md:col-span-2">
              <label className="admin-label">Website</label>
              <input
                value={form.website ?? ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="admin-input h-9"
              />
            </div>
          </div>

          {/* Route builder */}
          <div className="admin-card space-y-3 bg-slate-50 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="admin-label">Origin country</label>
                <select
                  value={form.originCountry}
                  onChange={(e) => setForm({ ...form, originCountry: e.target.value })}
                  className="admin-input h-9 cursor-pointer"
                >
                  {EU_COUNTRY_CODES.filter((c) => c !== "fi").map((c) => (
                    <option key={c} value={c}>
                      {getCountryFlag(c)} {regionName(c, "en")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="admin-label">Direction</label>
                <div className="flex gap-1.5">
                  {DIRECTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, direction: d })}
                      className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                        form.direction === d
                          ? "bg-brand text-white"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {DIRECTION_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-2 text-center text-sm font-medium text-slate-700">
              {getCountryFlag(form.originCountry)}{" "}
              {formatRoute(form.originCountry, form.direction)} 🇫🇮
            </div>
          </div>

          {/* Services + prices */}
          <div className="space-y-2">
            <label className="admin-label">Services *</label>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-3">
              {SERVICE_OPTIONS.map((s) => (
                <label
                  key={s.key}
                  className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={form.services.includes(s.key)}
                    onChange={() => toggleService(s.key)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {SERVICE_OPTIONS.filter(
                (s) => s.priceField && form.services.includes(s.key)
              ).map((s) => (
                <div key={s.key} className="space-y-1">
                  <label className="admin-label">{s.label} price (€)</label>
                  <input
                    type="number"
                    value={form[s.priceField!] ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [s.priceField!]: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="admin-input h-9"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="admin-label">Capacity</label>
              <input
                value={form.capacity ?? ""}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Lead time</label>
              <input
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
                className="admin-input h-9"
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
              disabled={pending || !form.name.trim() || form.services.length === 0}
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
          <p className="p-10 text-center text-sm text-slate-400">
            No transport companies yet.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Route</th>
                <th>Services</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const status = getLifecycleStatus(c);
                return (
                  <tr key={c.id}>
                    <td className="font-medium text-slate-900">{c.name}</td>
                    <td className="text-xs text-slate-500">
                      {formatRoute(c.origin_country, c.direction)}
                    </td>
                    <td className="text-xs text-slate-500">
                      {serviceLabels(c.services)}
                    </td>
                    <td>
                      <LifecycleBadge row={c} rejectionReason={c.rejection_reason} />
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(c)}
                          className="admin-btn px-2 py-1"
                        >
                          Edit
                        </button>
                        {status !== "rejected" ? (
                          <button
                            disabled={pending}
                            onClick={() => handleReject(c)}
                            className="admin-btn px-2 py-1"
                          >
                            Reject
                          </button>
                        ) : (
                          <button
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const res = await reactivateTransport(c.id);
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
                              const res = await renewTransport(c.id);
                              handleResult(res, "Saved.");
                            })
                          }
                          className="admin-btn px-2 py-1"
                        >
                          Renew
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => handleDelete(c)}
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
