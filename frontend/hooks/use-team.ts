// frontend/hooks/use-team.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, apiJson } from "@/lib/api-client";
import { TeamMember, Invitation } from "@/types";

export function useTeam() {
  const { isLoaded, isSignedIn } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, i] = await Promise.all([
        apiJson<TeamMember[]>("/api/v1/team/members"),
        apiJson<Invitation[]>("/api/v1/team/invitations"),
      ]);
      setMembers(m);
      setInvitations(i);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    refresh().catch(console.error);
  }, [isLoaded, isSignedIn, refresh]);

  const invite = async (email: string, role: string): Promise<Invitation> => {
    const res = await apiFetch("/api/v1/team/invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    await refresh();
    return data;
  };

  const revokeInvite = async (id: string) => {
    await apiFetch(`/api/v1/team/invitations/${id}`, { method: "DELETE" });
    await refresh();
  };

  const updateRole = async (memberId: string, role: string) => {
    await apiFetch(`/api/v1/team/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    await refresh();
  };

  const removeMember = async (memberId: string) => {
    await apiFetch(`/api/v1/team/members/${memberId}`, { method: "DELETE" });
    await refresh();
  };

  return { members, invitations, loading, refresh, invite, revokeInvite, updateRole, removeMember };
}