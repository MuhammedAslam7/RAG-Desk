// frontend/app/verify-email/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { apiFetch } from "@/lib/api-client";

function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This verification link is missing or malformed.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/v1/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        setState("success");
        // If they were mid-invite when they signed up, bring them back to it.
        let pendingInvite: string | null = null;
        try {
          pendingInvite = sessionStorage.getItem("pending_invite");
          if (pendingInvite) sessionStorage.removeItem("pending_invite");
        } catch {
          /* ignore */
        }
        // New accounts have no organization yet — send them to onboarding.
        const target = pendingInvite
          ? `/invite/${pendingInvite}`
          : data.user?.organizationId
            ? "/overview"
            : "/onboarding";
        setTimeout(() => {
          router.replace(target);
          router.refresh();
        }, 1200);
      } catch (err: any) {
        if (cancelled) return;
        setState("error");
        setMessage(
          (err.message ?? "").replace(/^API \d+: /, "") ||
            "This verification link is invalid or has expired.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (state === "loading") {
    return (
      <AuthShell title="Verifying your email">
        <div className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthShell>
    );
  }

  if (state === "success") {
    return (
      <AuthShell title="Email verified" subtitle="You're all set — taking you to your workspace…">
        <div className="text-center py-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verification failed"
      footer={
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="text-center py-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
