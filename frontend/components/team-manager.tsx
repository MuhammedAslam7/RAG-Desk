// frontend/components/team-manager.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2, Copy, Check, Mail } from "lucide-react";
import { useTeam } from "@/hooks/use-team";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "agent", label: "Agent" },
  { value: "viewer", label: "Viewer" },
];

export default function TeamManager() {
  const { members, invitations, loading, invite, revokeInvite, updateRole, removeMember } = useTeam();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const created = await invite(email.trim(), role);
      setEmail("");
      if (created.inviteUrl) setLastInviteUrl(created.inviteUrl);
    } finally {
      setInviting(false);
    }
  };

  const copyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Team</h1>
        <p className="text-muted-foreground">Invite teammates and manage their access</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
          <Card className="border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Invite a teammate</h2>
            </div>
            <div className="flex gap-3">
              <Input
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border flex-1"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <Button onClick={handleInvite} disabled={!email.trim() || inviting} className="gap-2">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Invite
              </Button>
            </div>

            {lastInviteUrl && (
              <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Share this link with them — it expires in 7 days:
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded border border-border overflow-x-auto whitespace-nowrap">
                    {lastInviteUrl}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyLink(lastInviteUrl, "last")}>
                    {copiedId === "last" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {invitations.length > 0 && (
            <Card className="border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Pending invitations</h2>
              <div className="space-y-2">
                {invitations.map((i) => (
                  <div key={i.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm text-foreground">{i.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited as {i.role} · expires {new Date(i.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeInvite(i.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Members</h2>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm text-foreground">{m.email || "(no email synced yet)"}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(m.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.role === "owner" ? (
                        <Badge>Owner</Badge>
                      ) : (
                        <>
                          <select
                            value={m.role}
                            onChange={(e) => updateRole(m.id, e.target.value)}
                            className="h-8 rounded-md bg-input border border-border px-2 text-xs text-foreground"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember(m.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}