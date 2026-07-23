"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { categoryName, UNITS, type Category, type Product, type ScrapedPrice } from "@/lib/types";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  verifyProductImage,
  setProductImageStatus,
  type ProdActionState,
  type ProductInput,
} from "@/app/[locale]/admin/products/actions";
import {
  acceptScrapedPrice,
  rejectScrapedPrice,
  scrapeUrl,
  type ScrapeActionState,
} from "@/app/[locale]/admin/products/scrape-actions";

type Row = Product & { offerCount: number };

// English messages for error codes returned by the server actions.
const ERRORS: Record<string, string> = {
  invalidUrl: "Enter a valid http(s) URL (not a local address).",
  fetchFailed: "Could not fetch the page — check the URL.",
  notFound: "AI could not find a clear price for this product on the page.",
  aiFailed: "AI lookup failed — nothing was saved.",
  aiNoKey: "GEMINI_API_KEY is missing from .env.local — price lookup is disabled.",
  duplicateName: "A product name like this already exists.",
  genericError: "Something went wrong. Please try again.",
};
const errMsg = (code: string) => ERRORS[code] ?? ERRORS.genericError;

const SCRAPE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};
const SCRAPE_STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};

const EMPTY_FORM: ProductInput = {
  name: "",
  description: "",
  categorySlug: null,
  unit: "kpl",
  imageUrl: null,
  status: "active",
};

const STATUS_LABEL: Record<string, string> = {
  all: "All",
  active: "Active",
  hidden: "Hidden",
};

export function ProductsDashboard({
  products,
  categories,
  scrapedPrices,
}: {
  products: Row[];
  categories: Category[];
  scrapedPrices: ScrapedPrice[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [scrapeOpenFor, setScrapeOpenFor] = useState<string | null>(null);
  const [scrapeUrlInput, setScrapeUrlInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (categoryFilter && p.category_slug !== categoryFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, statusFilter, categoryFilter, search]);

  const counts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.status === "active").length,
      hidden: products.filter((p) => p.status === "hidden").length,
    }),
    [products]
  );

  const handleResult = (res: ProdActionState, msg: string) => {
    if (res.error) setNotice(errMsg(res.error));
    else {
      setNotice(msg);
      router.refresh();
    }
  };

  const startEdit = (p?: Row) => {
    if (p) {
      setEditingId(p.id);
      setForm({
        name: p.name,
        description: p.description,
        categorySlug: p.category_slug,
        unit: p.unit,
        imageUrl: p.image_url,
        status: p.status,
      });
    } else {
      setEditingId("new");
      setForm(EMPTY_FORM);
    }
    setNotice(null);
  };

  const submitForm = () => {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const res =
        editingId === "new"
          ? await createProduct(form)
          : await updateProduct(editingId as string, form);
      handleResult(res, "Saved.");
      if (!res.error) setEditingId(null);
    });
  };

  const handleDelete = (p: Row) => {
    const warning =
      p.offerCount > 0
        ? `Product name "${p.name}" has ${p.offerCount} linked product${p.offerCount === 1 ? "" : "s"} that will also be removed. Delete anyway?`
        : `Permanently delete product name "${p.name}"?`;
    if (!confirm(warning)) return;
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      handleResult(res, "Deleted.");
    });
  };

  const handleScrapeResult = (res: ScrapeActionState, msg?: string) => {
    if (res.error) setNotice(errMsg(res.error));
    else {
      if (msg) setNotice(msg);
      router.refresh();
    }
  };

  const toggleScrape = (id: string) => {
    setScrapeOpenFor((cur) => (cur === id ? null : id));
    setScrapeUrlInput("");
    setNotice(null);
  };

  const verifyImage = (p: Row) => {
    startTransition(async () => {
      const res = await verifyProductImage(p.id);
      if (res.error) setNotice(errMsg(res.error));
      else {
        setNotice(`Image ${res.success}.`);
        router.refresh();
      }
    });
  };

  const setImgStatus = (id: string, status: "approved" | "blocked") => {
    startTransition(async () => {
      const res = await setProductImageStatus(id, status);
      handleResult(res, "Saved.");
    });
  };

  const offerCountLabel = (n: number) =>
    n === 0 ? "no products" : `${n} product${n === 1 ? "" : "s"}`;

  const IMG_PILL: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700",
    blocked: "bg-red-50 text-red-600",
    pending: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        {(["all", "active", "hidden"] as const).map((s) => (
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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="admin-input h-9 w-48 cursor-pointer"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {categoryName(c, "en")}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search names…"
          className="admin-input h-9 w-44"
        />
        <button
          onClick={() => startEdit()}
          className="admin-btn admin-btn-primary ml-auto"
        >
          + Add product name
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
            {editingId === "new" ? "Add product name" : "Edit product name"}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="admin-label">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Category</label>
              <select
                value={form.categorySlug ?? ""}
                onChange={(e) => setForm({ ...form, categorySlug: e.target.value || null })}
                className="admin-input h-9 cursor-pointer"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {categoryName(c, "en")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="admin-label">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="admin-input h-9 cursor-pointer"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="admin-label">Image URL</label>
              <input
                value={form.imageUrl ?? ""}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value || null })}
                placeholder="https://…"
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="admin-label">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="admin-input"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Status</label>
              <div className="flex gap-3">
                {(["active", "hidden"] as const).map((s) => (
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
          <p className="p-10 text-center text-sm text-slate-400">
            No product names yet.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Products</th>
                <th>Image</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = categories.find((c) => c.slug === p.category_slug);
                const productScrapes = scrapedPrices.filter(
                  (sp) => sp.product_id === p.id
                );
                const hasPendingScrape = productScrapes.some(
                  (sp) => sp.status === "pending"
                );
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td className="font-medium text-slate-900">{p.name}</td>
                      <td>{cat ? categoryName(cat, "en") : "—"}</td>
                      <td>{p.unit}</td>
                      <td>{offerCountLabel(p.offerCount)}</td>
                      <td>
                        {p.image_url ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`admin-pill ${IMG_PILL[p.image_status] ?? IMG_PILL.pending}`}
                            >
                              {p.image_status}
                            </span>
                            <button
                              onClick={() => verifyImage(p)}
                              disabled={pending}
                              title="Run AI moderation on this image"
                              className="admin-btn px-1.5 py-0.5 text-[11px]"
                            >
                              Verify
                            </button>
                            {p.image_status !== "blocked" ? (
                              <button
                                onClick={() => setImgStatus(p.id, "blocked")}
                                disabled={pending}
                                className="admin-btn admin-btn-danger px-1.5 py-0.5 text-[11px]"
                              >
                                Block
                              </button>
                            ) : (
                              <button
                                onClick={() => setImgStatus(p.id, "approved")}
                                disabled={pending}
                                className="admin-btn px-1.5 py-0.5 text-[11px]"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`admin-pill ${
                            p.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => toggleScrape(p.id)}
                            className="admin-btn px-2 py-1"
                          >
                            Find prices
                            {hasPendingScrape && (
                              <span className="ml-1 text-amber-500">●</span>
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(p)}
                            className="admin-btn px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            disabled={pending}
                            onClick={() => handleDelete(p)}
                            className="admin-btn admin-btn-danger px-2 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {scrapeOpenFor === p.id && (
                      <tr>
                        <td colSpan={7} className="bg-slate-50">
                          <div className="space-y-3 p-1">
                            <div className="flex gap-2">
                              <input
                                value={scrapeUrlInput}
                                onChange={(e) => setScrapeUrlInput(e.target.value)}
                                placeholder="Competitor product page URL…"
                                className="admin-input h-9 flex-1"
                              />
                              <button
                                disabled={pending || !scrapeUrlInput.trim()}
                                onClick={() =>
                                  startTransition(async () => {
                                    const res = await scrapeUrl(
                                      p.id,
                                      scrapeUrlInput.trim()
                                    );
                                    handleScrapeResult(
                                      res,
                                      res.error
                                        ? undefined
                                        : "Price found and queued for review."
                                    );
                                    if (!res.error) setScrapeUrlInput("");
                                  })
                                }
                                className="admin-btn admin-btn-primary"
                              >
                                Fetch
                              </button>
                            </div>

                            {productScrapes.length === 0 ? (
                              <p className="text-xs text-slate-400">
                                No fetched prices yet.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {productScrapes.map((sp) => (
                                  <div
                                    key={sp.id}
                                    className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2"
                                  >
                                    <span
                                      className={`admin-pill ${SCRAPE_STATUS_STYLE[sp.status]}`}
                                    >
                                      {SCRAPE_STATUS_LABEL[sp.status]}
                                    </span>
                                    <span className="text-xs font-medium text-slate-800">
                                      {sp.price.toFixed(2)} € / {sp.unit}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {sp.supplier_name}
                                    </span>
                                    <a
                                      href={sp.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="truncate text-[11px] text-brand hover:underline"
                                    >
                                      {sp.source_url}
                                    </a>
                                    {sp.status === "pending" && (
                                      <div className="ml-auto flex gap-1.5">
                                        <button
                                          disabled={pending}
                                          onClick={() =>
                                            startTransition(async () => {
                                              const res = await acceptScrapedPrice(
                                                sp.id
                                              );
                                              handleScrapeResult(
                                                res,
                                                "Accepted and added as a product."
                                              );
                                            })
                                          }
                                          className="admin-btn admin-btn-primary px-2 py-1"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          disabled={pending}
                                          onClick={() =>
                                            startTransition(async () => {
                                              const res = await rejectScrapedPrice(
                                                sp.id
                                              );
                                              handleScrapeResult(res);
                                            })
                                          }
                                          className="admin-btn admin-btn-danger px-2 py-1"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
