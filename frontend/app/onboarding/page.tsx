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
    <div className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Create your organization</h1>
      <p className="text-gray-500">This is your workspace. You can invite teammates later.</p>
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Acme Inc."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        onClick={submit}
        disabled={loading}
      >
        {loading ? "Creating…" : "Create organization"}
      </button>
    </div>
  );
}