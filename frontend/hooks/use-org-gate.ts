"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";

export function useOrgGate() {
  const router = useRouter();
  useEffect(() => {
    apiJson<{ hasOrg: boolean }>("/api/v1/org/me")
      .then((d) => { if (!d.hasOrg) router.replace("/onboarding"); })
      .catch(console.error);
  }, [router]);
}