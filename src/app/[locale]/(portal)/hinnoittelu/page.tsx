import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegistrationSection } from "@/components/registration-form";

export const metadata: Metadata = { title: "Hinnoittelu" };
export const dynamic = "force-dynamic";

export default async function HinnoitteluPage() {
  const t = await getTranslations("hinnoittelu");

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

      {/* B2B Media Statistics & Highlights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {(
          [
            { n: 1, cls: "text-[#1450A3]" },
            { n: 2, cls: "text-emerald-800" },
            { n: 3, cls: "text-orange-600" },
            { n: 4, cls: "text-purple-800" },
          ] as const
        ).map(({ n, cls }) => (
          <div
            key={n}
            className="space-y-1 border-2 border-black bg-white p-5 text-center"
          >
            <span className="block font-mono text-xs font-bold uppercase text-gray-400">
              {t(`stat${n}Label`)}
            </span>
            <strong className={`font-mono text-2xl font-black ${cls}`}>
              {t(`stat${n}Value`)}
            </strong>
            <span className="block font-mono text-[10px] text-zinc-500">
              {t(`stat${n}Sub`)}
            </span>
          </div>
        ))}
      </div>

      {/* Info Text on Partnership */}
      <div className="space-y-4 border-2 border-black bg-blue-50 p-6">
        <h3 className="font-mono text-sm font-bold uppercase text-[#1450A3]">
          {t("whyTitle")}
        </h3>
        <div className="grid grid-cols-1 gap-6 font-sans text-xs leading-relaxed text-stone-700 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="space-y-1">
              <strong className="block font-bold text-black">
                {t(`why${n}Title`)}
              </strong>
              <p>{t(`why${n}Text`)}</p>
            </div>
          ))}
        </div>
      </div>

      <RegistrationSection />
    </div>
  );
}
