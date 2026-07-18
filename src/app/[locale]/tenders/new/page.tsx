import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { TenderForm } from "@/components/tender-form";

export const metadata: Metadata = { title: "Post a tender" };
export const dynamic = "force-dynamic";

export default async function NewTenderPage() {
  const t = await getTranslations("tenderForm");
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
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <TenderForm categories={categories ?? []} />
    </div>
  );
}
