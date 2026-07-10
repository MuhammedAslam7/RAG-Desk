"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSidebar } from "@/lib/sidebar-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Knowledge",
    icon: BookOpen,
    href: "/dashboard/knowledge",
  },
  {
    label: "Facts",
    icon: Lightbulb,
    href: "/dashboard/facts",
  },
  {
    label: "Chat",
    icon: MessageSquare,
    href: "/",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isOpen, toggle } = useSidebar();

  return (
    <TooltipProvider>
      <aside
        className={`border-r border-border bg-card flex flex-col h-screen transition-all duration-300 ${
          isOpen ? "w-60" : "w-20"
        }`}
      >
        {/* Header */}
        <div className="border-b border-border px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 flex-shrink-0">
                <span className="text-sm font-bold text-white">RD</span>
              </div>
              {isOpen && (
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-foreground truncate">
                    RAG Desk
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">
                    AI Assistant
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="text-foreground hover:bg-secondary flex-shrink-0"
            >
              {isOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          {isOpen && (
            <div className="mb-6">
              <p className="px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Workspace
              </p>
            </div>
          )}

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              const navItem = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-secondary"
                  } ${isOpen ? "" : "justify-center"}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {isOpen && <span className="text-sm truncate">{item.label}</span>}
                </Link>
              );

              if (!isOpen) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return navItem;
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-4 flex-shrink-0">
          {isOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    U
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    User
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    user@example.com
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <UserButton />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <UserButton />
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
