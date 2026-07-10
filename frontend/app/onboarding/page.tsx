"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Loader2, ArrowRight } from "lucide-react";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      await apiFetch("/api/v1/org/onboard", {
        method: "POST",
        body: JSON.stringify({ org_name: name }),
      });
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to create organization. Please try again.");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && name.trim()) {
      submit();
    }
  };

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary">RD</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to RAG Desk</h1>
          <p className="text-muted-foreground">
            Create your workspace to get started with your AI assistant
          </p>
        </div>

        {/* Form Card */}
        <div className="card border border-primary/20 bg-card/50 backdrop-blur-sm p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Organization Name
            </label>
            <input
              type="text"
              placeholder="e.g., Acme Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50 transition-all"
            />
            <p className="text-xs text-muted-foreground mt-2">
              You can invite teammates to this workspace later.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3">
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !name.trim()}
            className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <span>Create Organization</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              This creates your workspace. You can add members and manage settings later.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl mb-2">📚</div>
            <p className="text-xs text-muted-foreground">Build Knowledge</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🤖</div>
            <p className="text-xs text-muted-foreground">Train AI</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">💬</div>
            <p className="text-xs text-muted-foreground">Deploy Chat</p>
          </div>
        </div>
      </div>
    </div>
  );
}
