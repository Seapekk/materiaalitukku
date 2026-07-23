"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";

export type ScrapeActionState = { success?: string; error?: string };

function isSafeUrl(urlStr: string): boolean {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "0.0.0.0" || host === "::1") return false;
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  return true;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200_000);
}

type Extracted = {
  found: boolean;
  supplierName?: string;
  productTitle?: string;
  price?: number;
  unit?: string;
};

async function extractPriceFromPage(
  pageText: string,
  productName: string
): Promise<Extracted | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    `You are extracting a competitor's price listing from a fetched web page's text content, ` +
                    `for the building-material product "${productName}". Find the current selling price ` +
                    `(as shown on the page), the seller/company name, the exact product title as listed, and the ` +
                    `sales unit (e.g. kpl, m2, m3, jm, kg, tn). Return ONLY a JSON object: ` +
                    `{"found": boolean, "supplierName": string, "productTitle": string, "price": number, "unit": string}. ` +
                    `Set "found" to false if no clear price for this specific product is present on the page — never guess.\n\n` +
                    `PAGE TEXT:\n${pageText}`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== "string") return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || typeof parsed.found !== "boolean")
      return null;
    return parsed as Extracted;
  } catch {
    return null;
  }
}

// v1: admin pastes a competitor URL for a specific product; Gemini extracts
// a price from that one page. Nothing is written to offers automatically —
// this only stages a row in scraped_prices for review (acceptScrapedPrice).
export async function scrapeUrl(productId: string, url: string): Promise<ScrapeActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!isSafeUrl(url)) return { error: "invalidUrl" };
  if (!process.env.GEMINI_API_KEY) return { error: "aiNoKey" };

  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .single();
  if (!product) return { error: "genericError" };

  let html: string;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MateriaalitukkuBot/1.0)" },
    });
    if (!res.ok) {
      await logActivity(supabase, user, "errors", `Scrape fetch failed (${res.status}) for ${url}`);
      return { error: "fetchFailed" };
    }
    html = await res.text();
  } catch {
    await logActivity(supabase, user, "errors", `Scrape fetch threw for ${url}`);
    return { error: "fetchFailed" };
  }

  const pageText = stripHtml(html);
  if (pageText.length < 50) {
    await logActivity(supabase, user, "errors", `Scrape page too short for ${url}`);
    return { error: "fetchFailed" };
  }

  const extracted = await extractPriceFromPage(pageText, product.name);
  if (!extracted) {
    await logActivity(supabase, user, "errors", `Gemini price extraction failed for ${url}`);
    return { error: "aiFailed" };
  }
  if (!extracted.found || !extracted.price || extracted.price <= 0)
    return { error: "notFound" };

  const { error } = await supabase.from("scraped_prices").insert({
    product_id: productId,
    source_url: url,
    supplier_name: (extracted.supplierName || "?").slice(0, 200),
    product_title: (extracted.productTitle || product.name).slice(0, 200),
    price: extracted.price,
    unit: (extracted.unit || "kpl").slice(0, 10),
  });
  if (error) return { error: "genericError" };

  await logActivity(
    supabase,
    user,
    "products",
    `Scraped a price for "${product.name}" from ${url}`
  );
  revalidatePath("/", "layout");
  return { success: "scraped" };
}

// Resolve-or-create the supplier by name, upsert an offer at the scraped
// price, mark the staged row accepted. Never auto-publishes on its own —
// this only runs when an admin explicitly clicks Accept.
export async function acceptScrapedPrice(id: string): Promise<ScrapeActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { data: sp } = await supabase
    .from("scraped_prices")
    .select("*")
    .eq("id", id)
    .single();
  if (!sp || sp.status !== "pending") return { error: "genericError" };

  let supplierId: string | undefined;
  const { data: existingSupplier } = await supabase
    .from("suppliers")
    .select("id")
    .ilike("name", sp.supplier_name)
    .maybeSingle();
  if (existingSupplier) {
    supplierId = existingSupplier.id;
  } else {
    const { data: created } = await supabase
      .from("suppliers")
      .insert({ name: sp.supplier_name })
      .select("id")
      .single();
    supplierId = created?.id;
  }
  if (!supplierId) return { error: "genericError" };

  const { data: existingOffer } = await supabase
    .from("offers")
    .select("id")
    .eq("product_id", sp.product_id)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (existingOffer) {
    await supabase
      .from("offers")
      .update({ unit_price: sp.price, updated_at: new Date().toISOString() })
      .eq("id", existingOffer.id);
  } else {
    await supabase.from("offers").insert({
      product_id: sp.product_id,
      supplier_id: supplierId,
      unit_price: sp.price,
      source: "scraped",
    });
  }

  await supabase
    .from("scraped_prices")
    .update({ status: "accepted", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity(
    supabase,
    user,
    "products",
    `Accepted scraped price ${sp.price} € (${sp.supplier_name}) from ${sp.source_url}`
  );
  revalidatePath("/", "layout");
  return { success: "accepted" };
}

export async function rejectScrapedPrice(id: string): Promise<ScrapeActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  await supabase
    .from("scraped_prices")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");

  revalidatePath("/", "layout");
  return { success: "saved" };
}
