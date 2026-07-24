// frontend/app/page.tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SignInPrompt from "@/components/sign-in-prompt";
import { Loader2 } from "lucide-react";

export default function Page() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/overview");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center bg-background px-4 py-4">
      {/* Compact header */}
      <div className="text-center max-w-md flex-shrink-0 mb-2">
        <div className="mb-3 flex justify-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-lg">🔐</span>
          </div>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-1">
          Welcome to RAG Desk
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your AI support assistant.
        </p>
      </div>

      {/* Auth area — scaled slightly so it fits alongside the header */}
      <div className="flex-1 min-h-0 w-full flex items-start justify-center overflow-auto">
        <div className="w-full max-w-sm scale-[0.92] origin-top">
          <SignInPrompt />
        </div>
      </div>
    </div>
  );
}