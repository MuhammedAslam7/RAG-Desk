// frontend/app/oauth/callback/page.tsx
"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { useAuth } from "@/lib/auth-context";

function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/overview";

  useEffect(() => {
    if (error) return;
    let cancelled = false;
    (async () => {
      // The backend already set the session cookies on the redirect — this
      // picks them up, then we continue to the original destination.
      await refresh();
      if (cancelled) return;
      router.replace(next);
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [error, next, refresh, router]);

  if (error) {
    return (
      <AuthShell title="Sign-in failed" subtitle="We couldn't complete Google sign-in">
        <div className="text-center py-4 space-y-5">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">
            Something went wrong while connecting your Google account. Please
            try again or sign in with your email.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Signing you in…" subtitle="Please wait a moment">
      <div className="flex justify-center py-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </AuthShell>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthCallback />
    </Suspense>
  );
}
