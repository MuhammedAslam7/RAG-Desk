"use client";

import { useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Header - visible only on mobile */}
      <div className="md:hidden flex items-center justify-between h-16 border-b border-border bg-card px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="text-foreground hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent flex-shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground truncate">
            RAG Desk
          </h1>
        </div>
        
        <div className="w-10" />
      </div>

      {/* Mobile Sidebar Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-60 p-0 border-r border-border bg-card">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div onClick={() => setIsOpen(false)}>
            <AppSidebar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
