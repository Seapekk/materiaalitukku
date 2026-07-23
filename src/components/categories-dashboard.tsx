"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EU_LANGUAGES } from "@/lib/languages";
import { categoryName, type Category } from "@/lib/types";
import {
  createCategory,
  deleteCategory,
  translateCategoryMissing,
  updateCategory,
  type CatActionState,
} from "@/app/[locale]/admin/categories/actions";

type Draft = { name: Record<string, string>; parentSlug: string | null; sortOrder: number };

const ERRORS: Record<string, string> = {
  aiFailed: "AI translation failed — nothing was saved.",
  aiNoKey: "GEMINI_API_KEY is missing from .env.local — AI translation is disabled.",
  categoryInUse: "Category is still used by some products — it cannot be deleted.",
  duplicateSlug: "That identifier is already in use — choose a different name.",
  genericError: "Something went wrong. Please try again.",
};
const errMsg = (code: string) => ERRORS[code] ?? ERRORS.genericError;

export function CategoriesDashboard({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [newNameFi, setNewNameFi] = useState("");
  const [newParentSlug, setNewParentSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);

  const topLevel = categories.filter((c) => !c.parent_slug);

  const draftFor = (c: Category): Draft =>
    drafts[c.slug] ?? {
      name: c.name,
      parentSlug: c.parent_slug,
      sortOrder: c.sort_order,
    };

  const patchDraft = (c: Category, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [c.slug]: { ...draftFor(c), ...patch } }));
  };

  const clearDraft = (slug: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  };

  const toggleExpanded = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleResult = (res: CatActionState, onSuccess: () => void) => {
    if (res.error) setNotice(errMsg(res.error));
    else onSuccess();
  };

  const handleAdd = () => {
    if (!newNameFi.trim()) return;
    startTransition(async () => {
      const res = await createCategory({
        nameFi: newNameFi,
        parentSlug: newParentSlug || null,
        sortOrder: newSortOrder,
      });
      handleResult(res, () => {
        setNotice("Saved.");
        setNewNameFi("");
        setNewParentSlug("");
        setNewSortOrder(0);
        router.refresh();
      });
    });
  };

  const handleSave = (c: Category) => {
    const draft = drafts[c.slug];
    if (!draft) return;
    startTransition(async () => {
      const res = await updateCategory(c.slug, draft);
      handleResult(res, () => {
        setNotice("Saved.");
        clearDraft(c.slug);
        router.refresh();
      });
    });
  };

  const handleDelete = (c: Category) => {
    if (!confirm(`Permanently delete category "${categoryName(c, "en")}"?`)) return;
    startTransition(async () => {
      const res = await deleteCategory(c.slug);
      handleResult(res, () => {
        setNotice("Deleted.");
        clearDraft(c.slug);
        router.refresh();
      });
    });
  };

  const handleTranslate = (c: Category) => {
    startTransition(async () => {
      const res = await translateCategoryMissing(c.slug);
      if (res.success === "nothingMissing") {
        setNotice("All languages are already translated.");
      } else {
        handleResult(res, () => {
          setNotice(`Translated into ${res.count ?? 0} language(s).`);
          clearDraft(c.slug);
          router.refresh();
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Add new */}
      <div className="admin-card space-y-3 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Add new category
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="admin-label">Name (Finnish)</label>
            <input
              value={newNameFi}
              onChange={(e) => setNewNameFi(e.target.value)}
              className="admin-input h-9 w-56"
            />
          </div>
          <div className="space-y-1">
            <label className="admin-label">Parent category</label>
            <select
              value={newParentSlug}
              onChange={(e) => setNewParentSlug(e.target.value)}
              className="admin-input h-9 w-56 cursor-pointer"
            >
              <option value="">— No parent (top level) —</option>
              {topLevel.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {categoryName(c, "en")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="admin-label">Sort order</label>
            <input
              type="number"
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(Number(e.target.value) || 0)}
              className="admin-input h-9 w-24"
            />
          </div>
          <button
            disabled={pending || !newNameFi.trim()}
            onClick={handleAdd}
            className="admin-btn admin-btn-primary"
          >
            + Add
          </button>
        </div>
      </div>

      {notice && (
        <p className="admin-card border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      {/* List */}
      <div className="admin-card divide-y divide-slate-100">
        {categories.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-400">
            No categories yet.
          </p>
        )}
        {categories.map((c) => {
          const draft = draftFor(c);
          const dirty = Boolean(drafts[c.slug]);
          const isOpen = expanded.has(c.slug);
          const missingCount = EU_LANGUAGES.filter(
            (l) => l.code !== "fi" && !draft.name[l.code]?.trim()
          ).length;

          return (
            <div key={c.slug} className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => toggleExpanded(c.slug)}
                  className="w-6 shrink-0 cursor-pointer text-sm text-slate-500"
                >
                  {isOpen ? "▾" : "▸"}
                </button>
                <input
                  value={draft.name.fi ?? ""}
                  onChange={(e) =>
                    patchDraft(c, { name: { ...draft.name, fi: e.target.value } })
                  }
                  className="admin-input h-9 w-56 font-medium"
                />
                <span className="text-[11px] text-slate-400">slug: {c.slug}</span>
                <select
                  value={draft.parentSlug ?? ""}
                  onChange={(e) => patchDraft(c, { parentSlug: e.target.value || null })}
                  className="admin-input h-9 w-48 cursor-pointer"
                >
                  <option value="">— No parent —</option>
                  {topLevel
                    .filter((tl) => tl.slug !== c.slug)
                    .map((tl) => (
                      <option key={tl.slug} value={tl.slug}>
                        {categoryName(tl, "en")}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => patchDraft(c, { sortOrder: Number(e.target.value) || 0 })}
                  className="admin-input h-9 w-20"
                />
                {missingCount > 0 && (
                  <span className="admin-pill bg-slate-100 text-slate-500">
                    {missingCount} missing
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    disabled={pending || !dirty}
                    onClick={() => handleSave(c)}
                    className="admin-btn admin-btn-primary"
                  >
                    Save
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => handleDelete(c)}
                    className="admin-btn admin-btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 pl-9">
                  <div className="flex items-center justify-between">
                    <span className="admin-label">Translations</span>
                    <button
                      disabled={pending}
                      onClick={() => handleTranslate(c)}
                      className="admin-btn"
                    >
                      Translate missing (AI)
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {EU_LANGUAGES.filter((l) => l.code !== "fi").map((l) => (
                      <div key={l.code} className="flex items-center gap-1.5">
                        <span className="w-10 shrink-0 text-[11px] font-medium uppercase text-slate-400">
                          {l.flag} {l.code}
                        </span>
                        <input
                          value={draft.name[l.code] ?? ""}
                          onChange={(e) =>
                            patchDraft(c, {
                              name: { ...draft.name, [l.code]: e.target.value },
                            })
                          }
                          className="admin-input h-8 flex-1 py-1 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
