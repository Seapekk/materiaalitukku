"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  aiTranslateMissing,
  exportTranslationsCsv,
  importTranslationsCsv,
  saveTranslations,
  type TransActionState,
} from "@/app/[locale]/admin/translations/actions";

type Props = {
  baseEntries: { key: string; text: string }[];
  translations: Record<string, Record<string, string>>;
  languages: { code: string; flag: string; name: string; filled: number }[];
};

export function TranslationsDashboard({
  baseEntries,
  translations,
  languages,
}: Props) {
  const t = useTranslations("adminTrans");
  const router = useRouter();
  const [lang, setLang] = useState(languages[0]?.code ?? "et");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [missingOnly, setMissingOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
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
      setNotice(t(res.error));
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
              className={`border-2 px-2.5 py-1.5 font-mono text-xs font-extrabold uppercase transition-all ${
                active
                  ? "border-black bg-[#1450A3] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "border-stone-200 bg-[#FAF8F5] text-stone-800 hover:border-black"
              }`}
            >
              {l.flag} {l.code}{" "}
              <span
                className={
                  active
                    ? "text-blue-200"
                    : pct === 100
                      ? "text-emerald-700"
                      : pct === 0
                        ? "text-red-700"
                        : "text-amber-700"
                }
              >
                {pct}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <span className="font-mono text-xs font-bold uppercase text-gray-500">
          {t("language")}: {langName} · {t("missingCount", { count: missingCount })}
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍"
          className="input-brutal h-9 w-40 flex-none py-1"
        />
        <label className="flex cursor-pointer select-none items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-gray-700">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#1450A3]"
          />
          {t("missingOnly")}
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
            className="btn-brutal bg-white px-3 py-1.5 text-black hover:bg-stone-100"
          >
            ⬇ {t("exportCsv")}
          </button>
          <button
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="btn-brutal bg-white px-3 py-1.5 text-black hover:bg-stone-100"
          >
            ⬆ {t("importCsv")}
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
                handleResult(res, t("imported", { count: res.count ?? 0 }));
              });
            }}
          />
          <button
            disabled={pending || missingCount === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await aiTranslateMissing(lang);
                if (res.success === "nothingMissing") {
                  setNotice(t("nothingMissing"));
                } else {
                  handleResult(
                    res,
                    t("aiDone", { count: res.count ?? 0, lang: langName })
                  );
                }
              })
            }
            className="btn-brutal bg-[#1450A3] px-3 py-1.5 text-white hover:bg-black"
          >
            🤖 {t("aiTranslate")}
          </button>
        </div>
      </div>

      {notice && (
        <p className="border-2 border-black bg-yellow-50 px-3 py-2 font-mono text-xs font-bold uppercase">
          {notice}
        </p>
      )}

      {/* Editor table */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="grid grid-cols-12 border-b-2 border-black bg-black p-3 font-mono text-xs font-bold uppercase tracking-wide text-white">
          <div className="col-span-3 p-1">{t("key")}</div>
          <div className="col-span-4 border-l border-gray-800 p-1 pl-3">
            {t("baseText")}
          </div>
          <div className="col-span-5 border-l border-gray-800 p-1 pl-3">
            {t("translation")} ({lang.toUpperCase()})
          </div>
        </div>
        <div className="max-h-[60vh] divide-y divide-stone-200 overflow-y-auto">
          {visible.map(({ key, text }, index) => {
            const value = edits[key] ?? current[key] ?? "";
            const isMissing = !current[key] && !(edits[key] ?? "").trim();
            return (
              <div
                key={key}
                className={`grid grid-cols-12 items-center p-2 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50"
                }`}
              >
                <div className="col-span-3 break-all p-1 font-mono text-[10px] font-bold text-gray-500">
                  {isMissing && <span className="mr-1 text-red-600">●</span>}
                  {key}
                </div>
                <div className="col-span-4 p-1 pl-3 text-xs text-stone-700">
                  {text}
                </div>
                <div className="col-span-5 p-1 pl-3">
                  <input
                    value={value}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full border-2 border-stone-300 bg-white px-2 py-1.5 text-xs focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t-2 border-black bg-slate-50 p-3">
          <span className="font-mono text-xs text-gray-500">
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
                handleResult(res, t("saved"));
              })
            }
            className="btn-brutal bg-[#10B981] px-4 py-2 text-white hover:bg-[#059669]"
          >
            💾 {t("save")} ({Object.keys(edits).length})
          </button>
        </div>
      </div>
    </div>
  );
}
