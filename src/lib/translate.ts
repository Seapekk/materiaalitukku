// Multi-engine text translation for the admin translation tools.
// Default engine is Google Cloud Translation (per the spec); Gemini, Claude and
// GPT are LLM alternatives. Every engine returns `string[] | null` with the
// same strict contract: any failure (missing key, network, bad JSON, wrong
// length, empty string) returns null so callers write nothing — never a
// partial result.

export const TRANSLATION_ENGINES = [
  { id: "cloud", label: "Google Cloud Translation", env: "GOOGLE_TRANSLATE_API_KEY" },
  { id: "gemini", label: "Gemini 2.0 Flash", env: "GEMINI_API_KEY" },
  { id: "claude", label: "Claude", env: "ANTHROPIC_API_KEY" },
  { id: "gpt", label: "OpenAI GPT", env: "OPENAI_API_KEY" },
] as const;

export type TranslationEngine = (typeof TRANSLATION_ENGINES)[number]["id"];
export const DEFAULT_ENGINE: TranslationEngine = "cloud";

export function engineKeyConfigured(engine: TranslationEngine): boolean {
  const meta = TRANSLATION_ENGINES.find((e) => e.id === engine);
  return !!meta && Boolean(process.env[meta.env]);
}

// Validate an LLM's JSON-array reply against the input length.
function parseArray(raw: unknown, expectedLen: number): string[] | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== expectedLen) return null;
  if (parsed.some((s) => typeof s !== "string" || s.trim() === "")) return null;
  return (parsed as string[]).map((s) => s.trim());
}

function llmPrompt(
  texts: string[],
  targetLanguageName: string,
  targetLangCode: string,
  extraInstruction: string,
  sourceLang: string
): string {
  const from =
    sourceLang === "auto"
      ? `the following strings (auto-detect each string's language)`
      : `the following ${sourceLang} strings`;
  return (
    `Translate ${from} of a building-materials price ` +
    `comparison site into ${targetLanguageName} (${targetLangCode}). ` +
    extraInstruction +
    `Return ONLY a JSON array of the translated strings, in the same order, ` +
    `same length.\n\n${JSON.stringify(texts)}`
  );
}

export async function translateTexts(
  texts: string[],
  targetLanguageName: string,
  targetLangCode: string,
  extraInstruction = "",
  engine: TranslationEngine = DEFAULT_ENGINE,
  // Source language code, or "auto" to detect (e.g. carrier descriptions that
  // may be written in any language). Defaults to Finnish for the legacy callers.
  sourceLang = "fi"
): Promise<string[] | null> {
  if (texts.length === 0) return null;
  try {
    switch (engine) {
      case "cloud":
        return await translateCloud(texts, targetLangCode, sourceLang);
      case "gemini":
        return await translateGemini(
          texts,
          targetLanguageName,
          targetLangCode,
          extraInstruction,
          sourceLang
        );
      case "claude":
        return await translateClaude(
          texts,
          targetLanguageName,
          targetLangCode,
          extraInstruction,
          sourceLang
        );
      case "gpt":
        return await translateGpt(
          texts,
          targetLanguageName,
          targetLangCode,
          extraInstruction,
          sourceLang
        );
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// --- Google Cloud Translation v2 (default) ---------------------------------
async function translateCloud(
  texts: string[],
  targetLangCode: string,
  sourceLang: string
): Promise<string[] | null> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texts,
        // Omit `source` to let Google auto-detect the language.
        ...(sourceLang && sourceLang !== "auto" ? { source: sourceLang } : {}),
        target: targetLangCode,
        format: "text",
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const arr = data?.data?.translations;
  if (!Array.isArray(arr) || arr.length !== texts.length) return null;
  const out = arr.map((t: { translatedText?: string }) => (t.translatedText ?? "").trim());
  if (out.some((s: string) => s === "")) return null;
  return out;
}

// --- Gemini ----------------------------------------------------------------
async function translateGemini(
  texts: string[],
  name: string,
  code: string,
  extra: string,
  sourceLang: string
): Promise<string[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: llmPrompt(texts, name, code, extra, sourceLang) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return parseArray(data?.candidates?.[0]?.content?.parts?.[0]?.text, texts.length);
}

// --- Claude (Anthropic Messages API) ---------------------------------------
async function translateClaude(
  texts: string[],
  name: string,
  code: string,
  extra: string,
  sourceLang: string
): Promise<string[] | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: llmPrompt(texts, name, code, extra, sourceLang) }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return parseArray(data?.content?.[0]?.text, texts.length);
}

// --- OpenAI GPT ------------------------------------------------------------
async function translateGpt(
  texts: string[],
  name: string,
  code: string,
  extra: string,
  sourceLang: string
): Promise<string[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: llmPrompt(texts, name, code, extra, sourceLang) }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return parseArray(data?.choices?.[0]?.message?.content, texts.length);
}
