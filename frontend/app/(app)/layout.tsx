// frontend/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ProfileSync } from "@/components/profile-sync";

interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
  role: string;
  organizationId: string | null;
}

/** Authoritative server-side auth check — forwards the httpOnly cookies to the
 *  backend and asks it to validate the session. */
async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader.includes("access_token")) return null;
  try {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionUser;
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect("/sign-in");
  if (!session.organizationId) redirect("/onboarding");

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