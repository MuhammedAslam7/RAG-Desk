// frontend/components/sign-in-prompt.tsx
"use client";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useState } from "react";

export default function SignInPrompt({ token }: { token: string }) {
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");
  const returnUrl = `/invite/${token}`;

  return (
    <div className="mt-4">
      {mode === "sign-up" ? (
        <SignUp
          routing="hash"
          forceRedirectUrl={returnUrl}
          fallbackRedirectUrl={returnUrl}
          signInUrl={`/invite/${token}`}
        />
      ) : (
        <SignIn
          routing="hash"
          forceRedirectUrl={returnUrl}
          fallbackRedirectUrl={returnUrl}
        />
      )}
      <button
        onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
        className="text-xs text-muted-foreground mt-2 underline"
      >
        {mode === "sign-up" ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}