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
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-2xl">🔐</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome to RAG Desk
        </h1>
        <p className="text-muted-foreground mb-8">
          Sign in to manage your AI support assistant.
        </p>
        <SignInPrompt />
      </div>
    </div>
  );
}