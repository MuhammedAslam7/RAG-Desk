// frontend/app/(app)/layout.tsx
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { SidebarProvider } from "@/lib/sidebar-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MobileHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <AppSidebar />
        </div>
        <main className="flex-1 overflow-hidden w-full">{children}</main>
      </div>
    </SidebarProvider>
  );
}