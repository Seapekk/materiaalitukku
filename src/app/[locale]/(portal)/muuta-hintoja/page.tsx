import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Portal } from "@/components/portal";

export const metadata: Metadata = { title: "Muuta hintoja" };
export const dynamic = "force-dynamic";

export default async function MuutaHintojaPage() {
  const t = await getTranslations("nav");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <h1 className="text-center font-mono text-2xl font-black uppercase tracking-tight">
        {t("changePrices")}
      </h1>
      <Portal priceFirst />
    </div>
  );
}
