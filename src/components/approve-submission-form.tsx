"use client";

import { useMemo, useRef, useState } from "react";

type ProductOption = { id: string; name: string; unit: string };

export function ApproveSubmissionForm({
  submissionId,
  rawName,
  products,
  approveAction,
}: {
  submissionId: string;
  rawName: string;
  products: ProductOption[];
  approveAction: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProductOption | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, products]);

  const pick = (p: ProductOption | null) => {
    setSelected(p);
    setQuery(p ? p.name : "");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <form action={approveAction} className="flex items-start gap-2">
        <input type="hidden" name="id" value={submissionId} />
        <input type="hidden" name="productId" value={selected?.id ?? ""} />
        <div className="w-56">
          <input
            type="text"
            value={query}
            placeholder="Match existing product name…"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            className="admin-input h-8 py-1 text-xs"
          />
          {open && (
            <ul className="absolute z-10 mt-1 max-h-48 w-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(null)}
                  className="w-full border-b border-slate-100 px-2 py-1.5 text-left text-[11px] font-medium text-brand hover:bg-slate-50"
                >
                  + New product name: “{rawName}”
                </button>
              </li>
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(p)}
                    className="w-full px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    {p.name} <span className="text-slate-400">({p.unit})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="admin-btn admin-btn-primary h-8">Approve</button>
      </form>
    </div>
  );
}
