// frontend/components/profile-sync.tsx
"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

export function ProfileSync() {
  const { isLoaded, isSignedIn, user } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const email = user?.email;
    if (!email) return;
    apiFetch("/api/v1/org/sync", {
      method: "POST",
      body: JSON.stringify({ email }),
    }).catch(console.error);
  }, [isLoaded, isSignedIn, user]);

  return null;
}