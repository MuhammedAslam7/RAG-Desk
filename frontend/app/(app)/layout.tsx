// frontend/app/(app)/layout.tsx
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ProfileSync } from "@/components/profile-sync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ProfileSync />
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