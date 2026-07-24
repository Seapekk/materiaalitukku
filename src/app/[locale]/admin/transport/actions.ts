"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";
import {
  DEFAULT_ENGINE,
  engineKeyConfigured,
  translateTexts,
  type TranslationEngine,
} from "@/lib/translate";
import { DESC_LANGS, missingDescLangs } from "@/lib/transport-i18n";
import type { RouteDirection, SocialLink, TransportCompany } from "@/lib/types";

export type TransportActionState = { success?: string; error?: string; count?: number };

export type TransportInput = {
  name: string;
  originCountry: string;
  direction: RouteDirection;
  services: string[]; // transport-category slugs
  servicePrices: Record<string, number>; // { slug: from-price € }
  socials: SocialLink[];
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
};

// Shared row shape for create/update: services are category slugs, prices live
// in service_prices, and the legacy ftl/ltl/express columns are back-filled from
// it so the public price fallback keeps working. Capacity/lead-time are retired.
function transportRow(data: TransportInput) {
  const p = data.servicePrices ?? {};
  return {
    name: data.name.trim(),
    origin_country: data.originCountry,
    direction: data.direction,
    services: data.services,
    service_prices: p,
    socials: (data.socials ?? []).filter((s) => s.url?.trim()),
    ftl_price: p.ftl ?? null,
    ltl_price: p.ltl ?? null,
    express_price: p.pikakuljetus ?? null,
    email: data.email,
    phone: data.phone,
    website: data.website,
    description: data.description,
  };
}

export async function createTransport(data: TransportInput): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.name.trim()) return { error: "genericError" };
  if (data.services.length === 0) return { error: "noServices" };

  const { error } = await supabase.from("transport_companies").insert(transportRow(data));
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Created transport company "${data.name}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function updateTransport(
  id: string,
  data: TransportInput
): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.name.trim()) return { error: "genericError" };
  if (data.services.length === 0) return { error: "noServices" };

  const { error } = await supabase
    .from("transport_companies")
    .update(transportRow(data))
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Updated transport company "${data.name}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function rejectTransport(id: string, reason: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("transport_companies")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Rejected transport company ${id}: ${reason}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function reactivateTransport(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("transport_companies")
    .update({ status: "active", rejected_at: null, rejection_reason: null })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Reactivated transport company ${id}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function renewTransport(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  const { error } = await supabase
    .from("transport_companies")
    .update({ status: "active", expires_at: expiresAt.toISOString() })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Renewed transport company ${id} for 365 days`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function deleteTransport(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase.from("transport_companies").delete().eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Deleted transport company ${id}`);
  revalidatePath("/", "layout");
  return { success: "deleted" };
}

// Registrations (reg_type = 'transport') submitted via /addbusiness.
export async function approveTransportRegistration(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();
  if (!reg || reg.status !== "pending" || reg.reg_type !== "transport")
    return { error: "genericError" };

  const payload = (reg.payload ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const direction: RouteDirection =
    payload.routeDirection === "outbound" || payload.routeDirection === "roundtrip"
      ? payload.routeDirection
      : "inbound";
  const services = Array.isArray(payload.services)
    ? payload.services.filter((s): s is string => typeof s === "string")
    : [];

  // { slug: from-price } collected per transport type on the /addbusiness form.
  const servicePrices: Record<string, number> = {};
  if (payload.servicePrices && typeof payload.servicePrices === "object") {
    for (const [k, v] of Object.entries(payload.servicePrices as Record<string, unknown>)) {
      if (typeof v === "number" && v > 0) servicePrices[k] = v;
    }
  }
  const socials = Array.isArray(payload.socials)
    ? (payload.socials as unknown[])
        .filter(
          (s): s is { platform: unknown; url: unknown } =>
            !!s && typeof s === "object" && "url" in s
        )
        .map((s) => ({ platform: String(s.platform ?? ""), url: String(s.url ?? "") }))
        .filter((s) => s.url.trim())
    : [];

  const { error } = await supabase.from("transport_companies").insert({
    name: reg.company_name,
    reg_number: str(payload.regNumber),
    address: str(payload.address),
    origin_country: str(payload.routeCountry) ?? "ee",
    direction,
    services,
    service_prices: servicePrices,
    socials,
    // Keep legacy per-service columns populated for the public price fallback.
    ftl_price: servicePrices.ftl ?? null,
    ltl_price: servicePrices.ltl ?? null,
    express_price: servicePrices.pikakuljetus ?? null,
    days: str(payload.days) ?? "",
    email: reg.email,
    phone: reg.phone,
    website: str(payload.website),
    description: str(payload.details),
  });
  if (error) return { error: "genericError" };

  await supabase.from("registrations").update({ status: "done" }).eq("id", id);
  await logActivity(
    supabase,
    user,
    "transport",
    `Approved transport registration "${reg.company_name}"`
  );
  revalidatePath("/", "layout");
  return { success: "approved" };
}

export async function rejectTransportRegistration(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  await supabase
    .from("registrations")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");

  await logActivity(supabase, user, "transport", `Rejected transport registration ${id}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

// Translate the free-text description of the given companies (or all, if the
// list is empty) into any of fi/en/sv still missing. Source language is
// auto-detected. Fills gaps only; existing translations are left untouched.
export async function translateTransportDescriptions(
  ids: string[],
  engine: TranslationEngine = DEFAULT_ENGINE
): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!engineKeyConfigured(engine)) return { error: "engineNotConfigured" };

  let query = supabase
    .from("transport_companies")
    .select("id, description, description_translations");
  if (ids.length > 0) query = query.in("id", ids);
  const { data } = await query;
  const companies = (data ?? []) as Pick<
    TransportCompany,
    "id" | "description" | "description_translations"
  >[];

  let updated = 0;
  let failed = 0;
  for (const c of companies) {
    const missing = missingDescLangs(c);
    if (missing.length === 0) continue;

    const next = { ...(c.description_translations ?? {}) };
    let changed = false;
    for (const code of missing) {
      const name = DESC_LANGS.find((l) => l.code === code)!.name;
      const out = await translateTexts([c.description!], name, code, "", engine, "auto");
      if (!out) {
        failed++;
        continue;
      }
      next[code] = out[0];
      changed = true;
    }
    if (changed) {
      const { error } = await supabase
        .from("transport_companies")
        .update({ description_translations: next })
        .eq("id", c.id);
      if (!error) updated++;
    }
  }

  await logActivity(
    supabase,
    user,
    "transport",
    `Translated descriptions for ${updated} transport companies (${failed} lang failures)`
  );
  revalidatePath("/", "layout");
  if (updated === 0 && failed > 0) return { error: "aiFailed" };
  return { success: "translated", count: updated };
}

// Bulk import transport companies from a JSON array OR a CSV export (round-trips
// the download). Rows with an `id` are upserted; rows without one are inserted.
export async function importTransportCompanies(text: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const trimmed = text.trim();
  let arr: Record<string, unknown>[];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { error: "genericError" };
    }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    arr = list.filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
  } else {
    arr = csvToTransportObjects(text);
  }

  const isUuid = (v: unknown): v is string =>
    typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const dir = (v: unknown): RouteDirection =>
    v === "outbound" || v === "roundtrip" ? v : "inbound";
  const cleanMap = (v: unknown): Record<string, string> => {
    const out: Record<string, string> = {};
    if (v && typeof v === "object")
      for (const [k, val] of Object.entries(v as Record<string, unknown>))
        if (typeof val === "string" && val.trim()) out[k] = val.trim();
    return out;
  };

  const toRow = (raw: Record<string, unknown>) => {
    const sp =
      raw.service_prices && typeof raw.service_prices === "object"
        ? (raw.service_prices as Record<string, unknown>)
        : {};
    const servicePrices: Record<string, number> = {};
    for (const [k, v] of Object.entries(sp)) if (typeof v === "number" && v > 0) servicePrices[k] = v;
    return {
      name: str(raw.name) ?? "",
      reg_number: str(raw.reg_number),
      origin_country: (str(raw.origin_country) ?? "ee").toLowerCase().slice(0, 2),
      direction: dir(raw.direction),
      address: str(raw.address),
      services: Array.isArray(raw.services)
        ? raw.services.filter((s): s is string => typeof s === "string")
        : [],
      service_prices: servicePrices,
      socials: Array.isArray(raw.socials)
        ? (raw.socials as unknown[])
            .filter((s): s is { platform: unknown; url: unknown } => !!s && typeof s === "object" && "url" in s)
            .map((s) => ({ platform: String(s.platform ?? ""), url: String(s.url ?? "") }))
            .filter((s) => s.url.trim())
        : [],
      ftl_price: servicePrices.ftl ?? null,
      ltl_price: servicePrices.ltl ?? null,
      express_price: servicePrices.pikakuljetus ?? null,
      email: str(raw.email),
      phone: str(raw.phone),
      website: str(raw.website),
      description: str(raw.description),
      description_translations: cleanMap(raw.description_translations),
      featured: raw.featured === true,
    };
  };

  const rows = arr.filter((r) => r && typeof r === "object" && str(r.name));
  if (rows.length === 0) return { error: "genericError" };

  const withId = rows.filter((r) => isUuid(r.id)).map((r) => ({ id: r.id as string, ...toRow(r) }));
  const withoutId = rows.filter((r) => !isUuid(r.id)).map((r) => toRow(r));

  if (withId.length) {
    const { error } = await supabase.from("transport_companies").upsert(withId, { onConflict: "id" });
    if (error) return { error: "genericError" };
  }
  if (withoutId.length) {
    const { error } = await supabase.from("transport_companies").insert(withoutId);
    if (error) return { error: "genericError" };
  }

  await logActivity(supabase, user, "transport", `Imported ${rows.length} transport companies`);
  revalidatePath("/", "layout");
  return { success: "imported", count: rows.length };
}

// Minimal CSV parser (quotes, escaped quotes, CRLF) → array of objects keyed by
// header. Reconstructs the nested fields the CSV export flattens.
function csvToTransportObjects(text: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\r") { /* skip */ }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length < 2) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  const jsonCell = (v: string, fallback: unknown) => {
    if (!v.trim()) return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  };

  return nonEmpty.slice(1).map((r) => {
    const g = (name: string) => r[header.indexOf(name)] ?? "";
    const obj: Record<string, unknown> = {
      id: g("id"),
      name: g("name"),
      reg_number: g("reg_number"),
      origin_country: g("origin_country"),
      direction: g("direction"),
      address: g("address"),
      services: g("services").split("|").map((s) => s.trim()).filter(Boolean),
      service_prices: jsonCell(g("service_prices"), {}),
      socials: jsonCell(g("socials"), []),
      email: g("email"),
      phone: g("phone"),
      website: g("website"),
      description: g("description"),
      featured: g("featured").toLowerCase() === "true",
    };
    const dt: Record<string, string> = {};
    for (const code of DESC_LANGS.map((l) => l.code)) {
      const v = g(`desc_${code}`).trim();
      if (v) dt[code] = v;
    }
    // Also accept a raw description_translations JSON column.
    obj.description_translations = header.includes("description_translations")
      ? jsonCell(g("description_translations"), dt)
      : dt;
    return obj;
  });
}
