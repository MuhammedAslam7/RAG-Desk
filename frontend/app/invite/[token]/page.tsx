// frontend/app/invite/[token]/page.tsx
"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api-client";
import SignInPrompt from "@/components/sign-in-prompt";
import { InvitePreview } from "@/types";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/team/invitations/preview/${token}`)
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => setPreview({ valid: false, reason: "Something went wrong." }));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/team/invitations/${token}/accept`, { method: "POST" });
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message?.includes("different email")
        ? "This invite was sent to a different email address."
        : "Couldn't accept this invite. It may have expired or already been used.");
      setAccepting(false);
    }
  };

  if (!preview) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!preview.valid) {
    return (
      <div className="h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid invitation</h1>
          <p className="text-muted-foreground">{preview.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">
          Join {preview.orgName}
        </h1>
        <p className="text-muted-foreground mb-2">
          You&apos;ve been invited as <span className="font-medium text-foreground">{preview.role}</span>.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Invite sent to {preview.email}
        </p>

        {!isLoaded ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        ) : !isSignedIn ? (
          <SignInPrompt token={token} />
        ) : (
          <button
            onClick={accept}
            disabled={accepting}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {accepting ? "Joining…" : "Accept & Join"}
          </button>
        )}

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    </div>
  );
}