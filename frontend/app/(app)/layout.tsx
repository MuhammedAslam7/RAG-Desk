// frontend/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ProfileSync } from "@/components/profile-sync";

async function hasOrg(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${apiUrl}/api/v1/org/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.hasOrg === true;
  } catch {
    return false;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, getToken } = await auth();

  if (!userId) redirect("/sign-in");

  const token = await getToken();
  if (!(await hasOrg(token))) redirect("/onboarding");

  return (
    <SidebarProvider>
      <ProfileSync />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden md:flex flex-shrink-0">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <AppHeader />
          <main className="flex-1 overflow-hidden min-h-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}