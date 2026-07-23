// Image moderation via Gemini vision. Classifies a product image as a
// legitimate, safe-for-work building-material photo (approve) or not (block).
// Returns "pending" whenever we can't decide (no key, fetch/parse failure) so
// nothing is auto-blocked on a technical error.
export type ImageVerdict = "approved" | "blocked" | "pending";

export async function classifyProductImage(
  imageUrl: string
): Promise<{ verdict: ImageVerdict; reason?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { verdict: "pending", reason: "no GEMINI_API_KEY" };

  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return { verdict: "pending", reason: `fetch ${imgRes.status}` };
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/"))
      return { verdict: "blocked", reason: "not an image" };
    const bytes = Buffer.from(await imgRes.arrayBuffer());
    if (bytes.byteLength > 8_000_000)
      return { verdict: "pending", reason: "image too large" };
    const base64 = bytes.toString("base64");

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
                    "You moderate product images for a construction-material " +
                    "marketplace. Reply with ONLY JSON " +
                    '{"ok": boolean, "reason": string}. ok=true if this is a ' +
                    "legitimate, safe-for-work photo or diagram of a building/" +
                    "construction material or product. ok=false if it is " +
                    "explicit, offensive, unrelated spam, or clearly not a " +
                    "product image.",
                },
                { inline_data: { mime_type: contentType, data: base64 } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return { verdict: "pending", reason: `gemini ${res.status}` };
    const json = await res.json();
    const text: string =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { verdict: "pending", reason: "unparseable" };
    const parsed = JSON.parse(match[0]) as { ok?: boolean; reason?: string };
    return {
      verdict: parsed.ok ? "approved" : "blocked",
      reason: parsed.reason,
    };
  } catch (e) {
    return { verdict: "pending", reason: String(e) };
  }
}
