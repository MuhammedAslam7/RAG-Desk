"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/knowledge", label: "Knowledge" },
  { href: "/dashboard/facts", label: "Facts" },
  { href: "/", label: "Chat" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="grid min-h-[calc(100vh-57px)] md:grid-cols-[228px_1fr]">
      <aside className="hidden border-r p-4 md:block" style={{ borderColor: "var(--border)" }}>
        <p className="label mb-2 px-1">Workspace</p>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = n.href === "/dashboard" ? path === n.href : path.startsWith(n.href) && n.href !== "/";
            return (
              <Link key={n.href} href={n.href} className="tab" data-active={active}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}