import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { HeaderNav } from "./header-nav";

export async function Header() {
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <HeaderNav
      loggedIn={!!user}
      labels={{
        products: t("products"),
        transport: t("transport"),
        suppliers: t("suppliers"),
        supplierArea: t("supplierArea"),
        addProducts: t("addProducts"),
        addBusiness: t("addBusiness"),
        contact: t("contact"),
        adminPanel: t("adminPanel"),
        logout: t("logout"),
      }}
    />
  );
}
