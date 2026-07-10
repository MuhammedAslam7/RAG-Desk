import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

async function hasOrg(token: string | null): Promise<boolean> {
  if (!token) return false;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/org/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.hasOrg === true;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");
  const token = await getToken();
  if (!(await hasOrg(token))) redirect("/onboarding");
  return <>{children}</>;
}