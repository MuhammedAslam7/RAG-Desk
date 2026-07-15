"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Globe, MessageSquare, Palette } from "lucide-react";
import { useOrgSettings } from "@/hooks/use-org-settings";
import { OrganizationSettings } from "@/types";
import EmbedSnippet from "./embed-snippet";

const POSITIONS = [
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ml", label: "Malayalam" },
  { value: "hi", label: "Hindi" },
];

export default function OrgSettingsManager() {
  const { org, loading, update } = useOrgSettings();
  const [form, setForm] = useState<Partial<OrganizationSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org) setForm(org.settings);
  }, [org]);

  const handleChange = (field: keyof OrganizationSettings, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(form);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !org) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">
          Workspace Settings
        </h1>
        <p className="text-muted-foreground">
          {org.name} &middot; <span className="font-mono">{org.slug}</span>
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
          {/* frontend/components/org-settings.manager.tsx — update the call site */}
          <EmbedSnippet slug={org.slug} position={org.settings.widgetPosition || "bottom-right"} />
          {/* Widget appearance */}
          <Card className="border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Widget Appearance
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Greeting message
                </label>
                <Textarea
                  placeholder="Hello! How can I help you today?"
                  value={form.widgetGreeting ?? ""}
                  onChange={(e) => handleChange("widgetGreeting", e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Accent color
                  </label>
                  <Input
                    type="text"
                    placeholder="#3b82f6"
                    value={form.widgetColor ?? ""}
                    onChange={(e) => handleChange("widgetColor", e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Widget position
                  </label>
                  <select
                    value={form.widgetPosition ?? "bottom-right"}
                    onChange={(e) => handleChange("widgetPosition", e.target.value)}
                    className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Response language
                </label>
                <select
                  value={form.language ?? "en"}
                  onChange={(e) => handleChange("language", e.target.value)}
                  className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card className="border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Website &amp; Security
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Website URL
                </label>
                <Input
                  placeholder="https://yourbusiness.com"
                  value={form.websiteUrl ?? ""}
                  onChange={(e) => handleChange("websiteUrl", e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Allowed domains
                </label>
                <Input
                  placeholder="yourbusiness.com, www.yourbusiness.com"
                  value={form.allowedDomains ?? ""}
                  onChange={(e) => handleChange("allowedDomains", e.target.value)}
                  className="bg-input border-border"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Comma-separated. The widget will only respond to requests
                  coming from these domains. Leave blank to allow any domain
                  (not recommended once you go live).
                </p>
              </div>
            </div>
          </Card>

          {/* Fallback */}
          <Card className="border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Fallback
              </h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Fallback contact email
              </label>
              <Input
                type="email"
                placeholder="support@yourbusiness.com"
                value={form.fallbackEmail ?? ""}
                onChange={(e) => handleChange("fallbackEmail", e.target.value)}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Where you&apos;d like to be notified when the AI can&apos;t
                answer a visitor&apos;s question.
              </p>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </Button>
            {saved && (
              <span className="text-sm text-muted-foreground">Saved ✓</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}