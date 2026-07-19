import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegistrationSection, type RegType } from "@/components/registration-form";

export const metadata: Metadata = { title: "Add Business" };
export const dynamic = "force-dynamic";

export default async function AddBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const t = await getTranslations("hinnoittelu");

  const initialType: RegType =
    type === "transport" || type === "product" ? type : "supplier";

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-10">
      <div className="space-y-3 border-2 border-black bg-black p-8 text-center text-white">
        <span className="bg-white px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-[#1450A3]">
          {t("heroChip")}
        </span>
        <h1 className="font-mono text-3xl font-black uppercase">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-gray-300">
          {t("heroText")}
        </p>
      </div>

      <RegistrationSection initialType={initialType} />
    </div>
  );
}
