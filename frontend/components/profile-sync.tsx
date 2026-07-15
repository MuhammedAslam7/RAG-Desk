// frontend/components/profile-sync.tsx
"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api-client";

export function ProfileSync() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return;
    apiFetch("/api/v1/org/sync", {
      method: "POST",
      body: JSON.stringify({ email }),
    }).catch(console.error);
  }, [isLoaded, isSignedIn, user]);

  return null;
}