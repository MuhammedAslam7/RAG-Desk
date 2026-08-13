// frontend/components/app-header.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";

const PAGE_LABELS: { path: string; label: string }[] = [
  { path: "/overview", label: "Overview" },
  { path: "/conversations", label: "Conversations" },
  { path: "/live-conversation", label: "Live Conversations" },
  { path: "/chat", label: "Chat" },
  { path: "/knowledge", label: "Knowledge" },
  { path: "/facts", label: "Facts" },
  { path: "/team", label: "Team" },
  { path: "/notifications", label: "Notifications" },
  { path: "/billing", label: "Billing" },
  { path: "/settings", label: "Settings" },
];

function usePageLabel(pathname: string | null): string {
  if (!pathname) return "RAG Desk";
  // Longest paths first so more specific routes win.
  const sorted = [...PAGE_LABELS].sort((a, b) => b.path.length - a.path.length);
  const hit = sorted.find(
    (p) => pathname === p.path || pathname.startsWith(p.path + "/")
  );
  return hit?.label ?? "RAG Desk";
}

export function AppHeader() {
  const pathname = usePathname();
  const { isOpen, toggle } = useSidebar();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const label = usePageLabel(pathname);

  return (
    <>
      <header className="flex-shrink-0 h-14 border-b border-border bg-card/60 backdrop-blur-md z-30">
        <div className="flex h-full items-center gap-2 px-4">
          {/* Mobile: open the navigation drawer */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden text-muted-foreground hover:text-foreground"
            title="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop: sidebar collapse toggle — sits right next to the sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="hidden md:inline-flex text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>

          {/* Page context */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="md:hidden flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {label}
              </p>
              <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
                RAG Desk · AI Support
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle inHeader />
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer — always shows the full sidebar, independent
          of the desktop collapse state (its own SidebarProvider). */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r border-border bg-card">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarProvider>
            <AppSidebar onNavigate={() => setDrawerOpen(false)} />
          </SidebarProvider>
        </SheetContent>
      </Sheet>
    </>
  );
}
