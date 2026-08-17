// frontend/components/sign-in-prompt.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function SignInPrompt({ token }: { token?: string }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const returnUrl = token ? `/invite/${token}` : "/overview";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "sign-up") {
      if (!name.trim()) return setError("Please enter your name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return setError("Please enter a valid email address.");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
      if (password !== confirm) return setError("Passwords don't match.");
    } else if (!email.trim() || !password) {
      return setError("Please enter your email and password.");
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        await apiFetch("/api/v1/auth/signup", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        });
        // Remember the invite so the verification page can bring them back
        // here once their email is confirmed.
        if (token) {
          try {
            sessionStorage.setItem("pending_invite", token);
          } catch {
            /* ignore */
          }
        }
        setSent(true);
      } else {
        await apiFetch("/api/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        await refresh();
        router.replace(returnUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(
        (err.message ?? "").replace(/^API \d+: /, "") ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-6">
        <p className="text-sm font-medium text-foreground mb-1">Check your email</p>
        <p className="text-xs text-muted-foreground">
          We sent a verification link to <span className="text-foreground">{email}</span>.
          Click it to activate your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <form onSubmit={submit} className="space-y-3">
        {mode === "sign-up" && (
          <div>
            <label htmlFor="sp-name" className="block text-xs font-medium text-foreground mb-1">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="sp-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="pl-9 bg-input border-border h-10 text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="sp-email" className="block text-xs font-medium text-foreground mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="sp-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="pl-9 bg-input border-border h-10 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sp-password" className="block text-xs font-medium text-foreground mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="sp-password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "sign-up" ? "At least 8 characters" : "••••••••"}
              className="pl-9 pr-10 bg-input border-border h-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mode === "sign-up" && (
          <div>
            <label htmlFor="sp-confirm" className="block text-xs font-medium text-foreground mb-1">
              Confirm password
            </label>
            <Input
              id="sp-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              className="bg-input border-border h-10 text-sm"
            />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-10 gap-2 text-sm font-semibold">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "sign-up" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "sign-up" ? "sign-in" : "sign-up");
          setError(null);
        }}
        className="text-xs text-muted-foreground mt-3 underline hover:text-foreground transition-colors"
      >
        {mode === "sign-up" ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}