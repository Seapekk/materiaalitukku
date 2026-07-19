import { setRequestLocale } from "next-intl/server";
import { Hinta } from "@/components/hinta";

export const dynamic = "force-dynamic";

// The front page IS the price comparison, exactly like the original app.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <Hinta />;
}
