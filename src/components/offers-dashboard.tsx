"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getCountryFlag, getVatRate } from "@/lib/country";
import { offerVisual } from "@/lib/offer-source";
import type { Offer, OfferSource, Product, Supplier } from "@/lib/types";
import {
  createOffer,
  deleteOffer,
  updateOffer,
  setOfferStatus,
  addOfferNote,
  type OfferActionState,
  type OfferInput,
} from "@/app/[locale]/admin/offers/actions";

type Row = Offer & {
  product: Pick<Product, "id" | "name" | "unit"> | null;
  supplier: Pick<
    Supplier,
    "id" | "name" | "country" | "email" | "phone" | "website" | "address" | "social"
  > | null;
};

const ERRORS: Record<string, string> = {
  duplicateOffer:
    "This business already has a product entry for this name — edit it instead.",
  invalidPrice: "Enter a valid unit price (greater than 0 €).",
  genericError: "Something went wrong. Please try again.",
};
const errMsg = (code: string) => ERRORS[code] ?? ERRORS.genericError;

const STATUS_LABEL: Record<string, string> = {
  all: "All",
  active: "Published",
  pending: "Not approved",
  rejected: "Rejected",
};

const SOURCE_LABEL: Record<OfferSource, string> = {
  user: "User (green)",
  admin: "Admin (blue)",
  scraped: "Scraped (yellow)",
};

const EMPTY_FORM: OfferInput = {
  productId: "",
  supplierId: "",
  unitPrice: 0,
  wholesalePrice: null,
  minWholesaleQty: null,
  transportSmall: 0,
  transportBulk: 0,
  priceTiers: [],
  status: "active",
  source: "admin",
};

export function OffersDashboard({
  offers,
  products,
  suppliers,
}: {
  offers: Row[];
  products: Product[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending" | "rejected"
  >("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<OfferInput>(EMPTY_FORM);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offers.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (
        q &&
        !(o.product?.name ?? "").toLowerCase().includes(q) &&
        !(o.supplier?.name ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [offers, statusFilter, search]);

  const handleResult = (res: OfferActionState, msg: string) => {
    if (res.error) setNotice(errMsg(res.error));
    else {
      setNotice(msg);
      router.refresh();
    }
  };

  const startEdit = (o?: Row) => {
    if (o) {
      setEditingId(o.id);
      setForm({
        productId: o.product_id,
        supplierId: o.supplier_id,
        unitPrice: o.unit_price,
        wholesalePrice: o.wholesale_price,
        minWholesaleQty: o.min_wholesale_qty,
        transportSmall: o.transport_small,
        transportBulk: o.transport_bulk,
        priceTiers: o.price_tiers ?? [],
        status: o.status,
        source: o.source,
      });
    } else {
      setEditingId("new");
      setForm(EMPTY_FORM);
    }
    setNotice(null);
  };

  const submitForm = () => {
    if (!form.productId || !form.supplierId || form.unitPrice <= 0) return;
    startTransition(async () => {
      const res =
        editingId === "new"
          ? await createOffer(form)
          : await updateOffer(editingId as string, form);
      handleResult(res, "Saved.");
      if (!res.error) setEditingId(null);
    });
  };

  const handleDelete = (o: Row) => {
    if (
      !confirm(
        `Permanently delete this product (${o.product?.name ?? "?"} · ${o.supplier?.name ?? "?"})?`
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteOffer(o.id);
      handleResult(res, "Deleted.");
    });
  };

  const changeStatus = (o: Row, status: "active" | "rejected") => {
    startTransition(async () => {
      const res = await setOfferStatus(o.id, status);
      handleResult(res, status === "active" ? "Approved." : "Rejected.");
    });
  };

  const addNote = (o: Row) => {
    const content = window.prompt(
      `Add a note about "${o.product?.name ?? "?"} · ${o.supplier?.name ?? "?"}":`
    );
    if (!content || !content.trim()) return;
    startTransition(async () => {
      const res = await addOfferNote(
        o.id,
        `${o.product?.name ?? "?"} · ${o.supplier?.name ?? "?"}`,
        content
      );
      handleResult(res, "Note added.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        {(["all", "active", "pending", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product or business…"
          className="admin-input h-9 w-56"
        />
        <button
          onClick={() => startEdit()}
          className="admin-btn admin-btn-primary ml-auto"
        >
          + Add product
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
            {editingId === "new" ? "Add product" : "Edit product"}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="admin-label">Product name *</label>
              <select
                value={form.productId}
                disabled={editingId !== "new"}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="admin-input h-9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">-- Select product name --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit})
                  </option>
                ))}
              </select>
              <Link
                href="/admin/products"
                className="text-[11px] font-medium text-brand hover:underline"
              >
                + Add a new product name →
              </Link>
            </div>
            <div className="space-y-1">
              <label className="admin-label">Business *</label>
              <select
                value={form.supplierId}
                disabled={editingId !== "new"}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="admin-input h-9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">-- Select business --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {getCountryFlag(s.country)} {s.name}
                  </option>
                ))}
              </select>
              <Link
                href="/admin/suppliers"
                className="text-[11px] font-medium text-brand hover:underline"
              >
                + Add a new business →
              </Link>
            </div>

            <div className="space-y-1">
              <label className="admin-label">Unit price (€) *</label>
              <input
                type="number"
                step="0.01"
                value={form.unitPrice || ""}
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) || 0 })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Status</label>
              <div className="flex flex-wrap gap-3 pt-1.5">
                {(["active", "pending", "rejected"] as const).map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700"
                  >
                    <input
                      type="radio"
                      checked={form.status === s}
                      onChange={() => setForm({ ...form, status: s })}
                    />
                    {STATUS_LABEL[s]}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="admin-label">Source (row colour)</label>
              <select
                value={form.source}
                onChange={(e) =>
                  setForm({ ...form, source: e.target.value as OfferSource })
                }
                className="admin-input h-9 cursor-pointer"
              >
                {(Object.keys(SOURCE_LABEL) as OfferSource[]).map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="admin-label">Wholesale price (€, optional)</label>
              <input
                type="number"
                step="0.01"
                value={form.wholesalePrice ?? ""}
                onChange={(e) =>
                  setForm({ ...form, wholesalePrice: e.target.value === "" ? null : Number(e.target.value) })
                }
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Min. wholesale quantity</label>
              <input
                type="number"
                value={form.minWholesaleQty ?? ""}
                onChange={(e) =>
                  setForm({ ...form, minWholesaleQty: e.target.value === "" ? null : Number(e.target.value) })
                }
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Freight, small order (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.transportSmall || ""}
                onChange={(e) => setForm({ ...form, transportSmall: Number(e.target.value) || 0 })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Freight, bulk order (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.transportBulk || ""}
                onChange={(e) => setForm({ ...form, transportBulk: Number(e.target.value) || 0 })}
                className="admin-input h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="admin-label">
              Quantity price tiers (€/unit at/above quantity, e.g. 100 / 1000 / 10000)
            </label>
            {form.priceTiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="number"
                  value={tier.qty || ""}
                  placeholder="Qty (e.g. 100)"
                  onChange={(e) => {
                    const next = [...form.priceTiers];
                    next[i] = { ...next[i], qty: Number(e.target.value) || 0 };
                    setForm({ ...form, priceTiers: next });
                  }}
                  className="admin-input h-9 w-40"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="number"
                  step="0.01"
                  value={tier.price || ""}
                  placeholder="€/unit"
                  onChange={(e) => {
                    const next = [...form.priceTiers];
                    next[i] = { ...next[i], price: Number(e.target.value) || 0 };
                    setForm({ ...form, priceTiers: next });
                  }}
                  className="admin-input h-9 w-32"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      priceTiers: form.priceTiers.filter((_, j) => j !== i),
                    })
                  }
                  className="admin-btn admin-btn-danger px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  priceTiers: [...form.priceTiers, { qty: 0, price: 0 }],
                })
              }
              className="admin-btn px-2 py-1 text-[11px]"
            >
              + Add tier
            </button>
          </div>

          <div className="flex gap-2">
            <button
              disabled={pending || !form.productId || !form.supplierId || form.unitPrice <= 0}
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
          <p className="p-10 text-center text-sm text-slate-400">No products yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product name</th>
                <th>Business</th>
                <th>Country</th>
                <th>Contact</th>
                <th>Price (0% / incl. VAT)</th>
                <th>Transport → FI</th>
                <th>Source</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const v = offerVisual(o);
                const s = o.supplier;
                return (
                <tr key={o.id} className={v.row}>
                  <td className="font-medium text-slate-900">
                    {o.product?.name ?? "?"}
                  </td>
                  <td>{s?.name ?? "?"}</td>
                  <td className="whitespace-nowrap">
                    {getCountryFlag(s?.country ?? "")} {(s?.country ?? "").toUpperCase()}
                  </td>
                  <td className="text-[11px] leading-tight text-slate-500">
                    {s?.email && <div>{s.email}</div>}
                    {s?.phone && <div>{s.phone}</div>}
                    {s?.website && <div className="truncate">{s.website}</div>}
                    {s?.social && <div className="truncate">{s.social}</div>}
                    {s?.address && <div className="truncate">{s.address}</div>}
                    {!s?.email && !s?.phone && !s?.website && !s?.social && !s?.address && (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="font-medium text-emerald-700">
                    {o.unit_price.toFixed(2)} €
                    <span className="ml-1 text-[11px] font-normal text-slate-400">
                      /{" "}
                      {(
                        o.unit_price *
                        (1 + getVatRate(s?.country ?? "fi") / 100)
                      ).toFixed(2)}{" "}
                      € ({getVatRate(s?.country ?? "fi")}%)
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-[11px] text-slate-500">
                    {o.transport_small ? `${o.transport_small.toFixed(0)} €` : "—"}
                    {" / "}
                    {o.transport_bulk ? `${o.transport_bulk.toFixed(0)} €` : "—"}
                  </td>
                  <td>
                    <span className={`admin-pill ${offerVisual({ status: "active", source: o.source }).badge}`}>
                      {o.source}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-pill ${v.badge}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {o.status !== "active" && (
                        <button
                          disabled={pending}
                          onClick={() => changeStatus(o, "active")}
                          className="admin-btn px-2 py-1 text-emerald-700"
                        >
                          Approve
                        </button>
                      )}
                      {o.status !== "rejected" && (
                        <button
                          disabled={pending}
                          onClick={() => changeStatus(o, "rejected")}
                          className="admin-btn px-2 py-1 text-amber-700"
                        >
                          Reject
                        </button>
                      )}
                      <button onClick={() => startEdit(o)} className="admin-btn px-2 py-1">
                        Edit
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => addNote(o)}
                        className="admin-btn px-2 py-1"
                      >
                        Add note
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => handleDelete(o)}
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
