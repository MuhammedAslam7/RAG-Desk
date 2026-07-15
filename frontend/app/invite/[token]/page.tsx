// frontend/app/invite/[token]/page.tsx
"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api-client";
import SignInPrompt from "@/components/sign-in-prompt";
import { InvitePreview } from "@/types";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/team/invitations/preview/${token}`)
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => setPreview({ valid: false, reason: "Something went wrong." }));
  }, [token]);

  // Sync the Clerk email to the backend the moment we're signed in on this page,
  // so accept_invite's email check has something to compare against.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return;
    setSyncing(true);
    apiFetch("/api/v1/org/sync", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
      .catch(console.error)
      .finally(() => setSyncing(false));
  }, [isLoaded, isSignedIn, user]);

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
    <div className="h-screen overflow-hidden flex flex-col items-center bg-background px-4 py-4">
      {/* Compact header — tight spacing, no big icon up top */}
      <div className="text-center max-w-sm flex-shrink-0 mb-2">
        <h1 className="text-lg font-bold text-foreground mb-1">
          Join {preview.orgName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Invited as <span className="font-medium text-foreground">{preview.role}</span>
          {" · "}
          <span className="text-xs">{preview.email}</span>
        </p>
      </div>

      {/* Auth / accept area — slightly scaled down so it reliably fits
          alongside the header inside one viewport, no page scroll needed */}
      <div className="flex-1 min-h-0 w-full flex items-start justify-center overflow-auto">
        <div className="w-full max-w-sm">
          {!isLoaded ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !isSignedIn ? (
            <div className="scale-[0.92] origin-top">
              <SignInPrompt token={token} />
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" />
              <button
                onClick={accept}
                disabled={accepting || syncing}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {syncing ? "Preparing…" : accepting ? "Joining…" : "Accept & Join"}
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center mt-4">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}