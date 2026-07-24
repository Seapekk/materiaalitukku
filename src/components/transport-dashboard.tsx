"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCountryFlag } from "@/lib/country";
import { EU_COUNTRY_CODES } from "@/lib/eu-countries";
import { regionName } from "@/lib/kuljetus-constants";
import { getCountdownDays, getLifecycleStatus, type LifecycleStatus } from "@/lib/lifecycle";
import { LifecycleBadge } from "@/components/lifecycle-badge";
import { categoryName, formatRoute, type Category, type Registration, type RouteDirection, type TransportCompany } from "@/lib/types";
import {
  approveTransportRegistration,
  createTransport,
  deleteTransport,
  importTransportCompanies,
  reactivateTransport,
  rejectTransport,
  rejectTransportRegistration,
  renewTransport,
  translateTransportDescriptions,
  updateTransport,
  type TransportActionState,
  type TransportInput,
} from "@/app/[locale]/admin/transport/actions";
import { DESC_LANGS, missingDescLangs } from "@/lib/transport-i18n";
import { TRANSLATION_ENGINES, type TranslationEngine } from "@/lib/translate";

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
  servicePrices: {},
  socials: [],
  email: "",
  phone: "",
  website: "",
  description: "",
};

const SOCIAL_PRESETS = ["whatsapp", "facebook", "viber", "telegram", "x", "instagram"];
const isCustomPlatform = (p: string) => !SOCIAL_PRESETS.includes(p);

type SortKey = "status" | "daysLeft";
const STATUS_RANK: Record<LifecycleStatus, number> = {
  active: 0,
  expired: 1,
  rejected: 2,
};

export function TransportDashboard({
  companies,
  registrations,
  transportCategories,
}: {
  companies: TransportCompany[];
  registrations: Registration[];
  transportCategories: Category[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | LifecycleStatus>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<TransportInput>(EMPTY_FORM);
  const [notice, setNotice] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [engine, setEngine] = useState<TranslationEngine>(TRANSLATION_ENGINES[0].id);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runTranslate = (ids: string[]) =>
    startTransition(async () => {
      const res = await translateTransportDescriptions(ids, engine);
      if (res.error)
        setNotice(
          res.error === "engineNotConfigured"
            ? "That translation engine has no API key configured."
            : "Translation failed. Please try again."
        );
      else {
        setNotice(`Translated ${res.count ?? 0} description(s).`);
        router.refresh();
      }
    });

  // Socials editor (edit form)
  const addSocial = () =>
    setForm((f) => ({ ...f, socials: [...f.socials, { platform: "whatsapp", url: "" }] }));
  const patchSocial = (i: number, patch: Partial<{ platform: string; url: string }>) =>
    setForm((f) => ({
      ...f,
      socials: f.socials.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  const removeSocial = (i: number) =>
    setForm((f) => ({ ...f, socials: f.socials.filter((_, j) => j !== i) }));

  // Export / import
  const downloadBlob = (data: string, filename: string, mime: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () =>
    downloadBlob(JSON.stringify(companies, null, 2), "transport-companies.json", "application/json");

  const handleExportCsv = () => {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const cols = [
      "id", "name", "reg_number", "origin_country", "direction", "address",
      "services", "service_prices", "socials", "email", "phone", "website",
      "description", "desc_fi", "desc_en", "desc_sv", "status", "expires_at",
    ];
    const lines = [cols.join(",")];
    for (const c of companies) {
      const rec = c as unknown as Record<string, unknown>;
      const tr = c.description_translations ?? {};
      const cell = (k: string) => {
        if (k === "desc_fi") return tr.fi ?? "";
        if (k === "desc_en") return tr.en ?? "";
        if (k === "desc_sv") return tr.sv ?? "";
        const v = rec[k];
        if (v == null) return "";
        if (Array.isArray(v)) return k === "services" ? v.join("|") : JSON.stringify(v);
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
      };
      lines.push(cols.map((k) => esc(cell(k))).join(","));
    }
    downloadBlob(lines.join("\n"), "transport-companies.csv", "text/csv;charset=utf-8");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        const res = await importTransportCompanies(String(reader.result ?? ""));
        if (res.error) setNotice("Import failed — check the JSON file.");
        else {
          setNotice(`Imported ${res.count ?? 0} companies.`);
          router.refresh();
        }
      });
    };
    reader.readAsText(file);
  };

  // Category name for a slug (admin UI is English); falls back to the raw slug
  // so pre-existing free-text services still render.
  const catName = (slug: string) => {
    const c = transportCategories.find((x) => x.slug === slug);
    return c ? categoryName(c, "en") : slug;
  };
  const serviceLabels = (keys: string[]) => keys.map(catName).join(", ");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (statusFilter !== "all" && getLifecycleStatus(c) !== statusFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [companies, statusFilter, search]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const val = (c: TransportCompany) =>
      sort.key === "status"
        ? STATUS_RANK[getLifecycleStatus(c)]
        : (getCountdownDays(c.expires_at) ?? -1);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (val(a) - val(b)) * dir);
  }, [filtered, sort]);

  // Header click cycles descending (high→low) ⇄ ascending (low→high).
  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s && s.key === key
        ? { key, dir: s.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" }
    );
  const sortArrow = (key: SortKey) =>
    !sort || sort.key !== key ? "↕" : sort.dir === "desc" ? "▼" : "▲";

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
        servicePrices: { ...(c.service_prices ?? {}) },
        socials: [...(c.socials ?? [])],
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={handleExportJson} className="admin-btn">
            ↓ JSON
          </button>
          <button onClick={handleExportCsv} className="admin-btn">
            ↓ CSV
          </button>
          <button
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="admin-btn"
          >
            ↑ Import JSON/CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json,.csv,text/csv"
            onChange={handleImportJson}
            className="hidden"
          />
          <button onClick={() => startEdit()} className="admin-btn admin-btn-primary">
            + Add transport company
          </button>
        </div>
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

          {/* Services (all transport categories) + per-type "from" price */}
          <div className="space-y-2">
            <label className="admin-label">
              Transport types * — pick one or more; optional “from” price each
            </label>
            <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-2">
              {transportCategories.map((cat) => {
                const active = form.services.includes(cat.slug);
                return (
                  <div
                    key={cat.slug}
                    className={`flex items-center gap-2 rounded-md border p-2 ${
                      active ? "border-brand/40 bg-brand/5" : "border-slate-200"
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-1.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleService(cat.slug)}
                      />
                      {categoryName(cat, "en")}
                    </label>
                    {active && (
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-[10px] font-medium uppercase text-slate-400">
                          from €
                        </span>
                        <input
                          type="number"
                          value={form.servicePrices[cat.slug] ?? ""}
                          onChange={(e) =>
                            setForm((f) => {
                              const next = { ...f.servicePrices };
                              if (e.target.value === "") delete next[cat.slug];
                              else next[cat.slug] = Number(e.target.value);
                              return { ...f, servicePrices: next };
                            })
                          }
                          className="admin-input h-8 w-20"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {transportCategories.length === 0 && (
                <p className="col-span-full py-2 text-center text-xs text-slate-400">
                  No transport categories yet — add them under Categories.
                </p>
              )}
            </div>
          </div>

          {/* Social media (whatsapp / facebook / viber / telegram / x / instagram / custom) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="admin-label">Social media</label>
              <button type="button" onClick={addSocial} className="admin-btn px-2 py-1">
                + Add social
              </button>
            </div>
            {form.socials.length === 0 ? (
              <p className="text-xs text-slate-400">No social profiles.</p>
            ) : (
              <div className="space-y-2">
                {form.socials.map((s, i) => {
                  const custom = isCustomPlatform(s.platform);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={custom ? "muu" : s.platform}
                        onChange={(e) =>
                          patchSocial(i, {
                            platform: e.target.value === "muu" ? "" : e.target.value,
                          })
                        }
                        className="admin-input h-9 w-32 cursor-pointer"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="facebook">Facebook</option>
                        <option value="viber">Viber</option>
                        <option value="telegram">Telegram</option>
                        <option value="x">X (Twitter)</option>
                        <option value="instagram">Instagram</option>
                        <option value="muu">Muu / Other</option>
                      </select>
                      {custom && (
                        <input
                          value={s.platform}
                          onChange={(e) => patchSocial(i, { platform: e.target.value })}
                          placeholder="Platform"
                          className="admin-input h-9 w-28"
                        />
                      )}
                      <input
                        value={s.url}
                        onChange={(e) => patchSocial(i, { url: e.target.value })}
                        placeholder="URL / handle"
                        className="admin-input h-9 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeSocial(i)}
                        className="admin-btn admin-btn-danger px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="admin-label">Description</label>
            <textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="admin-input"
            />
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

      {/* Description translation engine (fi / en / sv, for the public listing) */}
      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-semibold text-slate-600">
          Description → fi / en / sv:
        </span>
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value as TranslationEngine)}
          className="admin-input h-9 w-auto cursor-pointer"
        >
          {TRANSLATION_ENGINES.map((eng) => (
            <option key={eng.id} value={eng.id}>
              {eng.label}
            </option>
          ))}
        </select>
        <button
          disabled={pending}
          onClick={() => runTranslate([])}
          className="admin-btn admin-btn-primary"
        >
          Translate all missing
        </button>
        <button
          disabled={pending || selected.size === 0}
          onClick={() => runTranslate([...selected])}
          className="admin-btn"
        >
          Translate selected ({selected.size})
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        {sorted.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">
            No transport companies yet.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={sorted.length > 0 && sorted.every((c) => selected.has(c.id))}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? new Set(sorted.map((c) => c.id)) : new Set()
                      )
                    }
                  />
                </th>
                <th>Company</th>
                <th>Country</th>
                <th>Route</th>
                <th>Services</th>
                <th>Descr. i18n</th>
                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className="flex items-center gap-1 font-semibold hover:text-slate-900"
                  >
                    Status <span className="text-slate-400">{sortArrow("status")}</span>
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort("daysLeft")}
                    className="flex items-center gap-1 font-semibold hover:text-slate-900"
                  >
                    Days left{" "}
                    <span className="text-slate-400">{sortArrow("daysLeft")}</span>
                  </button>
                </th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const status = getLifecycleStatus(c);
                const daysLeft = getCountdownDays(c.expires_at);
                const missing = missingDescLangs(c);
                return (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.name}`}
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelected(c.id)}
                      />
                    </td>
                    <td className="font-medium text-slate-900">{c.name}</td>
                    <td className="whitespace-nowrap text-xs text-slate-600">
                      {getCountryFlag(c.origin_country)}{" "}
                      {regionName(c.origin_country, "en")}
                    </td>
                    <td className="text-xs text-slate-500">
                      {formatRoute(c.origin_country, c.direction)}
                    </td>
                    <td className="text-xs text-slate-500">
                      {serviceLabels(c.services)}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {!c.description?.trim() ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className="flex gap-1">
                          {DESC_LANGS.map((l) => {
                            const has = !missing.includes(l.code);
                            return (
                              <span
                                key={l.code}
                                title={has ? `${l.code}: ✓` : `${l.code}: missing`}
                                className={`rounded px-1 font-mono text-[10px] font-bold uppercase ${
                                  has
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-600"
                                }`}
                              >
                                {l.code}
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </td>
                    <td>
                      <LifecycleBadge row={c} rejectionReason={c.rejection_reason} />
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {status === "rejected" ? (
                        <span className="text-slate-400">—</span>
                      ) : daysLeft == null ? (
                        <span className="font-medium text-rose-600">Expired</span>
                      ) : (
                        <span
                          className={
                            daysLeft <= 30
                              ? "font-medium text-amber-600"
                              : "text-slate-600"
                          }
                        >
                          {daysLeft} days
                        </span>
                      )}
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
