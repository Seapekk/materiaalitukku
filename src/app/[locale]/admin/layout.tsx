import { requireAdminPage } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/admin-nav";

// The admin dashboard is English-only by spec — no next-intl here.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale);

  return (
    <div className="admin-shell">
      <AdminNav />
      {children}
    </div>
  );
}
