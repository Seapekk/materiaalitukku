import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

// In the original AI Studio app /hinnoittelu and /addproducts are the same view.
export default async function HinnoitteluPage() {
  const locale = await getLocale();
  redirect({ href: "/addproducts", locale });
}
