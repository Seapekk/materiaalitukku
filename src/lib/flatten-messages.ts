// Flatten a nested messages object into dotted keys:
// { nav: { products: "x" } } → { "nav.products": "x" }
export function flattenMessages(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[full] = value;
    } else if (value && typeof value === "object") {
      Object.assign(out, flattenMessages(value as Record<string, unknown>, full));
    }
  }
  return out;
}
