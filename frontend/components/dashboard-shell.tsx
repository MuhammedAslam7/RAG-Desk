"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Brain, FileText, MessageSquare } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: Brain },
  { href: "/dashboard/facts", label: "Facts", icon: FileText },
  { href: "/", label: "Chat", icon: MessageSquare },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Workspace
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href) && item.href !== "/";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
