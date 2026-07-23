"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminNote } from "@/lib/types";
import {
  createNote,
  deleteNote,
  updateNote,
  type NoteActionState,
  type NoteInput,
} from "@/app/[locale]/admin/notes/actions";

const CATEGORIES: AdminNote["category"][] = [
  "PRICING",
  "LOGISTICS",
  "PURCHASING",
  "PROJECTS",
  "GENERAL",
];

const CATEGORY_LABEL: Record<string, string> = {
  PRICING: "Pricing",
  LOGISTICS: "Logistics",
  PURCHASING: "Purchasing",
  PROJECTS: "Projects",
  GENERAL: "General",
};

// Literal class names so Tailwind's scanner generates them.
const COLORS = ["bg-yellow-50", "bg-blue-50", "bg-pink-50", "bg-green-50", "bg-purple-50"] as const;

const EMPTY_FORM: NoteInput = { title: "", content: "", category: "GENERAL", color: COLORS[0] };

export function NotesDashboard({ notes }: { notes: AdminNote[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<NoteInput>(EMPTY_FORM);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleResult = (res: NoteActionState, msg: string) => {
    if (res.error) setNotice("Something went wrong. Please try again.");
    else {
      setNotice(msg);
      router.refresh();
    }
  };

  const startEdit = (n?: AdminNote) => {
    if (n) {
      setEditingId(n.id);
      setForm({ title: n.title, content: n.content, category: n.category, color: n.color });
    } else {
      setEditingId("new");
      setForm(EMPTY_FORM);
    }
    setNotice(null);
  };

  const submitForm = () => {
    if (!form.title.trim()) return;
    startTransition(async () => {
      const res =
        editingId === "new" ? await createNote(form) : await updateNote(editingId as string, form);
      handleResult(res, "Saved.");
      if (!res.error) setEditingId(null);
    });
  };

  const handleDelete = (n: AdminNote) => {
    if (!confirm(`Permanently delete note "${n.title}"?`)) return;
    startTransition(async () => {
      const res = await deleteNote(n.id);
      handleResult(res, "Deleted.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => startEdit()} className="admin-btn admin-btn-primary">
          + New note
        </button>
      </div>

      {notice && (
        <p className="admin-card border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      {editingId && (
        <div className="admin-card space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="admin-label">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="admin-input h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AdminNote["category"] })}
                className="admin-input h-9 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="admin-label">Color</label>
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-9 w-9 rounded-md border ${c} ${
                      form.color === c ? "border-slate-800" : "border-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="admin-label">Content</label>
              <textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="admin-input"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending || !form.title.trim()}
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

      {notes.length === 0 ? (
        <p className="admin-card p-10 text-center text-sm text-slate-400">
          No notes yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`space-y-2 rounded-md border border-slate-200 p-4 ${n.color}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="admin-pill bg-white/70 text-slate-600">
                  {CATEGORY_LABEL[n.category] ?? n.category}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(n)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                    aria-label="Edit"
                  >
                    Edit
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => handleDelete(n)}
                    className="text-xs text-red-500 hover:text-red-700"
                    aria-label="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
              <p className="whitespace-pre-wrap text-xs text-slate-600">{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
