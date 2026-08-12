"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";

type Theme = "dark" | "light";

const APP_PATHS = [
  "/overview",
  "/chat",
  "/conversations",
  "/knowledge",
  "/facts",
  "/team",
  "/notifications",
  "/billing",
  "/settings",
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

export function ThemeToggle({ inHeader = false }: { inHeader?: boolean }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("dark");

  // Sync with the no-flash script already applied in the root layout.
  // Widget pages keep their own theme (previously hardcoded dark), so skip them.
  useEffect(() => {
    if (pathname?.startsWith("/widget")) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("theme");
    } catch {}
    const initial: Theme = stored === "light" ? "light" : "dark";
    setTheme(initial);
    applyTheme(initial);
  }, [pathname]);

  // Hidden on the embed widget page — it is rendered inside customer sites/iframes.
  // On dashboard pages the header owns the toggle, so the floating FAB is suppressed.
  if (pathname?.startsWith("/widget")) return null;
  if (
    !inHeader &&
    pathname &&
    APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return null;
  }

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={
        inHeader
          ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-input/40 text-muted-foreground transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:text-foreground active:scale-95"
          : "fixed bottom-3 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-primary/50 hover:text-primary active:scale-95"
      }
    >
      {theme === "dark" ? (
        <Sun className={inHeader ? "h-4 w-4" : "h-5 w-5"} />
      ) : (
        <Moon className={inHeader ? "h-4 w-4" : "h-5 w-5"} />
      )}
    </button>
  );
}
