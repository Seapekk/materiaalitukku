import type { Metadata } from "next";
import { Kuljetus } from "@/components/kuljetus";

export const metadata: Metadata = { title: "Kuljetusyritykset" };
export const dynamic = "force-dynamic";

export default function TransportPage() {
  return <Kuljetus />;
}
