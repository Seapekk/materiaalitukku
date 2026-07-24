import type { TransportCompany } from "@/lib/types";

// Public-facing languages a carrier's free-text description is translated into.
export const DESC_LANGS = [
  { code: "fi", name: "Finnish" },
  { code: "en", name: "English" },
  { code: "sv", name: "Swedish" },
] as const;

// Which of fi/en/sv are still missing for a company that HAS a description.
export function missingDescLangs(
  c: Pick<TransportCompany, "description" | "description_translations">
): string[] {
  if (!c.description?.trim()) return [];
  const tr = c.description_translations ?? {};
  return DESC_LANGS.map((l) => l.code).filter((code) => !tr[code]?.trim());
}
