// frontend/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ProfileSync } from "@/components/profile-sync";

async function hasOrg(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/org/me`, {
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