import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth";

const ADMIN_NAV = [
  { href: "/admin",               label: "Dashboard" },
  { href: "/admin/raids",         label: "Raid Weeks" },
  { href: "/admin/import",        label: "Import (Gargul)" },
  { href: "/admin/loot-priority", label: "Loot Priority" },
  { href: "/admin/players",       label: "Players" },
  { href: "/admin/export",        label: "Export" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect to login if no session (belt + suspenders with middleware)
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-[--color-border] bg-[--color-surface] p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">
          Admin
        </p>

        <nav className="space-y-1">
          {ADMIN_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-sm text-[--color-text-muted] hover:bg-[--color-surface-2] hover:text-[--color-text] transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="mt-8">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-[--color-text-muted] hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-8 overflow-auto">{children}</div>
    </div>
  );
}
