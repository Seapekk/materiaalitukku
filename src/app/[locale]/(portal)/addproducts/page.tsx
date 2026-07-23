import type { Metadata } from "next";
import { AddProducts } from "@/components/addproducts";

export const metadata: Metadata = { title: "Add Products" };
export const dynamic = "force-dynamic";

export default function AddProductsPage() {
  return <AddProducts />;
}
