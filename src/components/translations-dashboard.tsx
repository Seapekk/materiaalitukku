"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  aiTranslateMissing,
  exportTranslationsCsv,
  importTranslationsCsv,
  saveTranslations,
  type TransActionState,
} from "@/app/[locale]/admin/translations/actions";
import {
  TRANSLATION_ENGINES,
  DEFAULT_ENGINE,
  type TranslationEngine,
} from "@/lib/translate";

type Props = {
  baseEntries: { key: string; text: string }[];
  translations: Record<string, Record<string, string>>;
  languages: { code: string; flag: string; name: string; filled: number }[];
};

const ERRORS: Record<string, string> = {
  aiFailed:
    "AI translation was aborted due to an error — nothing was written to the database.",
  aiNoKey: "GEMINI_API_KEY is missing from .env.local — AI translation is disabled.",
  genericError: "Something went wrong. Please try again.",
};
const errMsg = (code: string) => ERRORS[code] ?? ERRORS.genericError;

export function TranslationsDashboard({
  baseEntries,
  translations,
  languages,
}: Props) {
  const router = useRouter();
  const [lang, setLang] = useState(languages[0]?.code ?? "et");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [missingOnly, setMissingOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [engine, setEngine] = useState<TranslationEngine>(DEFAULT_ENGINE);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const total = baseEntries.length;
  const current = translations[lang] ?? {};
  const missingCount = total - Object.keys(current).length;
  const langName = languages.find((l) => l.code === lang)?.name ?? lang;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseEntries.filter(({ key, text }) => {
      if (missingOnly && current[key] && !(key in edits)) return false;
      if (!q) return true;
      return (
        key.toLowerCase().includes(q) ||
        text.toLowerCase().includes(q) ||
        (current[key] ?? "").toLowerCase().includes(q)
      );
    });
  }, [baseEntries, current, edits, missingOnly, search]);

  const handleResult = (res: TransActionState, doneMsg?: string) => {
    if (res.error) {
      setNotice(errMsg(res.error));
    } else if (doneMsg) {
      setNotice(doneMsg);
      setEdits({});
      router.refresh();
    }
  };

  const changeLang = (code: string) => {
    setLang(code);
    setEdits({});
    setNotice(null);
  };

  return (
    <div className="space-y-4">
      {/* Per-language coverage chips */}
      <div className="flex flex-wrap gap-1.5">
        {languages.map((l) => {
          const pct = total > 0 ? Math.round((l.filled / total) * 100) : 0;
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              onClick={() => changeLang(l.code)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {l.flag} {l.code}{" "}
              <span
                className={
                  active
                    ? "text-blue-100"
                    : pct === 100
                      ? "text-emerald-600"
                      : pct === 0
                        ? "text-red-500"
                        : "text-amber-600"
                }
              >
                {pct}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-medium text-slate-500">
          {langName} · {missingCount} missing
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="admin-input h-9 w-40 flex-none py-1"
        />
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-brand"
          />
          Missing only
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await exportTranslationsCsv();
                if (res.csv) {
                  const blob = new Blob([res.csv], {
                    type: "text/csv;charset=utf-8",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "materiaalitukku-translations.csv";
                  a.click();
                  URL.revokeObjectURL(a.href);
                } else {
                  handleResult(res);
                }
              })
            }
            className="admin-btn"
          >
            Export CSV
          </button>
          <button
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="admin-btn"
          >
            Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              startTransition(async () => {
                const text = await file.text();
                const res = await importTranslationsCsv(text);
                handleResult(res, `CSV imported: ${res.count ?? 0} translation(s) updated.`);
              });
            }}
          />
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as TranslationEngine)}
            className="admin-input h-9 w-52 cursor-pointer"
            title="Translation engine"
          >
            {TRANSLATION_ENGINES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <button
            disabled={pending || missingCount === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await aiTranslateMissing(lang, engine);
                if (res.success === "nothingMissing") {
                  setNotice("All texts are already translated for this language.");
                } else {
                  handleResult(
                    res,
                    `AI translated ${res.count ?? 0} text(s) into ${langName}.`
                  );
                }
              })
            }
            className="admin-btn admin-btn-primary"
          >
            AI translate missing
          </button>
        </div>
      </div>

      {notice && (
        <p className="admin-card border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      {/* Editor table */}
      <div className="admin-card overflow-hidden">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 p-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <div className="col-span-3 p-1">Key</div>
          <div className="col-span-4 border-l border-slate-200 p-1 pl-3">
            Base text (FI)
          </div>
          <div className="col-span-5 border-l border-slate-200 p-1 pl-3">
            Translation ({lang.toUpperCase()})
          </div>
        </div>
        <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {visible.map(({ key, text }) => {
            const value = edits[key] ?? current[key] ?? "";
            const isMissing = !current[key] && !(edits[key] ?? "").trim();
            return (
              <div key={key} className="grid grid-cols-12 items-center p-2">
                <div className="col-span-3 break-all p-1 text-[11px] font-medium text-slate-500">
                  {isMissing && <span className="mr-1 text-red-500">●</span>}
                  {key}
                </div>
                <div className="col-span-4 p-1 pl-3 text-xs text-slate-600">
                  {text}
                </div>
                <div className="col-span-5 p-1 pl-3">
                  <input
                    value={value}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="admin-input h-8 py-1 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-3">
          <span className="text-xs text-slate-500">
            {visible.length} / {total}
          </span>
          <button
            disabled={pending || Object.keys(edits).length === 0}
            onClick={() =>
              startTransition(async () => {
                const entries = Object.entries(edits).map(([key, text]) => ({
                  key,
                  text,
                }));
                const res = await saveTranslations(lang, entries);
                handleResult(res, "Translations saved.");
              })
            }
            className="admin-btn admin-btn-primary"
          >
            Save changes ({Object.keys(edits).length})
          </button>
        </div>
      </div>
    </div>
  );
}
