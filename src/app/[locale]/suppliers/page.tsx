import type { Metadata } from "next";
import { Toimittajat } from "@/components/toimittajat";

export const metadata: Metadata = { title: "Toimittajat" };
export const dynamic = "force-dynamic";

export default function SuppliersPage() {
  return <Toimittajat />;
}
