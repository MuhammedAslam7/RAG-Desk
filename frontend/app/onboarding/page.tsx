"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await apiFetch("/api/v1/org/onboard", {
        method: "POST",
        body: JSON.stringify({ org_name: name }),
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-md flex-col justify-center px-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold">Create your organization</h1>
        <p className="mt-1 text-[0.9375rem]" style={{ color: "var(--text-muted)" }}>
          This is your workspace. You can invite teammates later.
        </p>
        <div className="mt-6">
          <label className="label">Organization name</label>
          <input
            className="input" placeholder="Acme Inc." value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </div>
        <button className="btn btn-primary mt-4 w-full" onClick={submit} disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Create organization"}
        </button>
      </div>
    </div>
  );
}