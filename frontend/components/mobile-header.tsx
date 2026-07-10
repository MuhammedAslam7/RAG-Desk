"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
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
        
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-foreground">RAG Desk</h1>
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
