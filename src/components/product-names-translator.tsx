"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EU_LANGUAGES } from "@/lib/languages";
import {
  TRANSLATION_ENGINES,
  DEFAULT_ENGINE,
  type TranslationEngine,
} from "@/lib/translate";
import {
  translateProductNamesChunk,
  logTranslationRun,
  exportProductNames,
  importProductNames,
} from "@/app/[locale]/admin/product-names/actions";

type Item = { id: string; name: string; name_translations: Record<string, string> };

const CHUNK = 40;
const ERRORS: Record<string, string> = {
  aiNoKey: "The selected engine has no API key configured.",
  aiFailed: "The translation engine returned an error — progress so far was saved.",
  badLang: "Pick a target language other than Finnish.",
  parseFailed: "Could not parse that file.",
  genericError: "Something went wrong.",
};

export function ProductNamesTranslator({ products }: { products: Item[] }) {
  const router = useRouter();
  const nonFi = useMemo(() => EU_LANGUAGES.filter((l) => l.code !== "fi"), []);
  // Admin panel works in English by default; Finnish is the source name, so the
  // meaningful quick targets are English and Swedish.
  const [target, setTarget] = useState<string>("en");
  const [engine, setEngine] = useState<TranslationEngine>(DEFAULT_ENGINE);
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const enFileRef = useRef<HTMLInputElement>(null);
  const allFileRef = useRef<HTMLInputElement>(null);
  const termRef = useRef<HTMLPreElement>(null);

  const log = (line: string) =>
    setLines((prev) => {
      const next = [...prev, line];
      queueMicrotask(() => {
        if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
      });
      return next;
    });

  const translateInto = async (lang: string) => {
    if (running) return;
    const language = EU_LANGUAGES.find((l) => l.code === lang);
    setRunning(true);
    log(`$ translate → ${language?.name ?? lang} [${engine}]`);
    const items = products.map((p) => ({ id: p.id, name: p.name }));
    let done = 0;
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      log(`  translating ${i + 1}–${i + chunk.length} of ${items.length}…`);
      const res = await translateProductNamesChunk(chunk, lang, engine);
      if (res.error) {
        log(`  ✗ ${ERRORS[res.error] ?? res.error}`);
        log(`  → saved ${done} translation(s) before stopping.`);
        setRunning(false);
        router.refresh();
        return;
      }
      done += res.results?.length ?? 0;
      for (const r of res.results ?? []) {
        const src = products.find((p) => p.id === r.id)?.name ?? "";
        log(`    ✓ ${src} → ${r.text}`);
      }
    }
    log(`✓ done — ${done} name(s) translated and saved.`);
    await logTranslationRun(lang, done);
    setRunning(false);
    router.refresh();
  };

  const download = (format: "csv" | "json", scope: "en" | "all") =>
    startTransition(async () => {
      const res = await exportProductNames(format, scope);
      if (res.error || !res.data) {
        log(`  ✗ export failed`);
        return;
      }
      const blob = new Blob([res.data], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename ?? `product-names.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

  const onImport = (file: File) =>
    startTransition(async () => {
      const format: "csv" | "json" = file.name.endsWith(".json") ? "json" : "csv";
      const text = await file.text();
      const res = await importProductNames(format, text);
      if (res.error) log(`  ✗ import: ${ERRORS[res.error] ?? res.error}`);
      else {
        log(`✓ imported ${res.count ?? 0} row(s).`);
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          disabled={running}
          className="admin-input h-9 w-40 cursor-pointer"
        >
          {nonFi.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value as TranslationEngine)}
          disabled={running}
          className="admin-input h-9 w-52 cursor-pointer"
        >
          {TRANSLATION_ENGINES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => translateInto(target)}
          disabled={running}
          className="admin-btn admin-btn-primary"
        >
          Translate target
        </button>
        <button
          onClick={() => translateInto("en")}
          disabled={running}
          className="admin-btn"
        >
          → English
        </button>
        <button
          onClick={() => translateInto("sv")}
          disabled={running}
          className="admin-btn"
        >
          → Swedish
        </button>
        <span className="ml-auto text-xs text-slate-400">
          {products.length} product name(s)
        </span>
      </div>

      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-semibold text-slate-600">Download</span>
        <button onClick={() => download("csv", "en")} disabled={pending} className="admin-btn px-2 py-1">
          English CSV
        </button>
        <button onClick={() => download("csv", "all")} disabled={pending} className="admin-btn px-2 py-1">
          All languages CSV
        </button>
        <button onClick={() => download("json", "all")} disabled={pending} className="admin-btn px-2 py-1">
          All languages JSON
        </button>
        <span className="ml-4 text-xs font-semibold text-slate-600">Upload</span>
        <button
          onClick={() => enFileRef.current?.click()}
          disabled={pending}
          className="admin-btn px-2 py-1"
        >
          Upload English
        </button>
        <button
          onClick={() => allFileRef.current?.click()}
          disabled={pending}
          className="admin-btn px-2 py-1"
        >
          Upload all languages
        </button>
        {/* Both feed importProductNames, which matches rows by id and writes only
            the non-empty language columns present in the file — so an English-only
            file touches just `en`, and a full export updates every language. */}
        <input
          ref={enFileRef}
          type="file"
          accept=".csv,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onImport(f);
          }}
        />
        <input
          ref={allFileRef}
          type="file"
          accept=".csv,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onImport(f);
          }}
        />
      </div>

      <pre
        ref={termRef}
        className="h-80 overflow-auto rounded-md bg-slate-900 p-4 font-mono text-[12px] leading-relaxed text-emerald-300"
      >
        {lines.length === 0
          ? "# Terminal — translation progress will appear here.\n# Each chunk is saved as it completes, so a failure never loses prior work."
          : lines.join("\n")}
      </pre>
    </div>
  );
}
