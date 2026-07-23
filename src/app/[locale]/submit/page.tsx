import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SubmissionForm } from "@/components/submission-form";

export const metadata: Metadata = { title: "Lisää tuotteita" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const t = await getTranslations("submitForm");
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-mono text-2xl font-semibold uppercase tracking-tight md:text-3xl">
        {t("title")}
      </h1>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-stone-600">
        {t("intro")}
      </p>
      <SubmissionForm categories={categories ?? []} />
    </div>
  );
}
