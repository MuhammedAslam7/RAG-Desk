"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiJson } from "@/lib/api-client";
import { OrganizationDetails, OrganizationSettings } from "@/types";

export function useOrgSettings() {
  const [org, setOrg] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOrg(await apiJson<OrganizationDetails>("/api/v1/settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const update = async (patch: Partial<OrganizationSettings>) => {
    await apiFetch("/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    await refresh();
  };

  return { org, loading, update, refresh };
}