"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  MessageSquare,
  Inbox,
  History,
  BookOpen,
  Lightbulb,
  Users,
  Bell,
  CreditCard,
  Settings,
  Sparkles,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/lib/sidebar-context";
import { useNotifications } from "@/hooks/use-notifications";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_GROUPS: {
  label: string;
  items: { label: string; icon: React.ElementType; href: string }[];
}[] = [
  {
    label: "Overview",
    items: [{ label: "Overview", icon: LayoutDashboard, href: "/overview" }],
  },
  {
    label: "Support",
    items: [
      { label: "Chat", icon: MessageSquare, href: "/chat" },
      { label: "Live Conversations", icon: Inbox, href: "/live-conversation" },
      { label: "Conversations", icon: History, href: "/conversations" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Knowledge", icon: BookOpen, href: "/knowledge" },
      { label: "Facts", icon: Lightbulb, href: "/facts" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Team", icon: Users, href: "/team" },
      { label: "Notifications", icon: Bell, href: "/notifications" },
      { label: "Billing", icon: CreditCard, href: "/billing" },
      { label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen } = useSidebar();
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const displayName = user?.name || "Account";
  const email = user?.email ?? "";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <TooltipProvider delay={0}>
      <aside
        className={`border-r border-border bg-sidebar flex flex-col h-screen transition-all duration-300 ${
          isOpen ? "w-60" : "w-[68px]"
        }`}
      >
        {/* Brand */}
        <div className="px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-card flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            {isOpen && (
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold tracking-tight text-foreground truncate leading-tight">
                  RAG Desk
                </h1>
                <p className="text-[11px] text-muted-foreground truncate">
                  AI Support
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {isOpen && (
                  <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const badge =
                      item.href === "/notifications" ? unreadCount : 0;

                    const link = (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all ${
                          isOpen ? "" : "justify-center"
                        } ${
                          active
                            ? "bg-sidebar-accent text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-primary" />
                        )}
                        <Icon
                          key={
                            item.href === "/notifications" ? badge : undefined
                          }
                          className={`h-[18px] w-[18px] flex-shrink-0 ${
                            active ? "text-primary" : ""
                          } ${
                            item.href === "/notifications" && badge > 0
                              ? "text-rose-400"
                              : ""
                          }`}
                          style={
                            item.href === "/notifications" && badge > 0
                              ? {
                                  animation:
                                    "bell-shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
                                }
                              : undefined
                          }
                        />
                        {isOpen && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {badge > 0 &&
                          (isOpen ? (
                            <span
                              key={badge}
                              className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1.5 text-[11px] font-bold text-white shadow-lg"
                              style={{
                                animation:
                                  "badge-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), badge-glow 1.2s ease-out, badge-pulse 2s ease-in-out 1.2s infinite",
                              }}
                            >
                              {badge > 99 ? "99+" : badge}
                            </span>
                          ) : (
                            <span
                              key={badge}
                              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold text-white shadow-lg"
                              style={{
                                animation:
                                  "badge-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), badge-glow 1.2s ease-out, badge-pulse 2s ease-in-out 1.2s infinite",
                              }}
                            >
                              {badge > 99 ? "99+" : badge}
                            </span>
                          ))}
                      </Link>
                    );

                    if (!isOpen) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger>{link}</TooltipTrigger>
                          <TooltipContent side="right">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return link;
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User footer */}
        <div className="px-3 py-3 flex-shrink-0 border-t border-border/70">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={`flex w-full items-center rounded-lg transition-colors hover:bg-sidebar-accent/60 ${
                    isOpen ? "gap-2.5 px-2 py-2" : "justify-center p-2"
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {isOpen && (
                    <>
                      <span className="flex-1 min-w-0 text-left">
                        <span className="block text-[13px] font-medium text-foreground truncate">
                          {displayName}
                        </span>
                        <span className="block text-[11px] text-muted-foreground truncate">
                          {email || "Signed in"}
                        </span>
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </>
                  )}
                </button>
              }
            />
            <DropdownMenuContent align="end" sideOffset={6} className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{email || "Signed in"}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  await signOut();
                  router.replace("/sign-in");
                  router.refresh();
                }}
              >
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
