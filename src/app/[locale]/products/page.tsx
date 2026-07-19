import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

// The comparison lives on the front page now (like the original app).
export default async function ProductsPage() {
  const locale = await getLocale();
  redirect({ href: "/", locale });
}
