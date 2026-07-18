import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessForm } from "@/components/business-form";

export const metadata: Metadata = { title: "Add your business" };
export const dynamic = "force-dynamic";

export default async function NewBusinessPage() {
  const t = await getTranslations("businesses");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t("addBusiness")}</h1>
      <BusinessForm categories={categories ?? []} />
    </div>
  );
}
