import type { Metadata } from "next";
import { AddBusiness } from "@/components/addbusiness";

export const metadata: Metadata = { title: "Add Business" };
export const dynamic = "force-dynamic";

export default async function AddBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialType = type === "transport" ? "transport" : "supplier";

  return <AddBusiness initialType={initialType} />;
}
