import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebarNav } from "@/components/layout/AdminSidebarNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <AdminSidebarNav />
      <div className="flex-1 min-w-0 overflow-auto p-4 sm:p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
