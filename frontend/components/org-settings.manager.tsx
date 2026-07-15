// frontend/components/org-settings.manager.tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save, Globe, MessageSquare, Palette, Check } from "lucide-react";
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

const PRESET_COLORS = [
  "#3b82f6", "#0ea5e9", "#06b6d4", "#10b981",
  "#84cc16", "#f59e0b", "#f97316", "#ef4444",
  "#ec4899", "#a855f7", "#8b5cf6", "#6366f1",
];

function isValidHex(v: string) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v);
}

// ---- Color picker field: swatch button -> opens a small modal ----
function ColorPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || "#3b82f6");

  useEffect(() => {
    if (open) setDraft(value || "#3b82f6");
  }, [open, value]);

  const confirm = () => {
    if (isValidHex(draft)) {
      onChange(draft);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-9 rounded-md border border-border bg-input/20 px-3 flex items-center gap-2.5 text-sm text-foreground hover:border-primary/50 transition-colors"
      >
        <span
          className="h-5 w-5 rounded-full border border-border/50 flex-shrink-0"
          style={{ backgroundColor: value || "#3b82f6" }}
        />
        <span className="font-mono text-xs">{value || "#3b82f6"}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-card sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-foreground">Accent color</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live preview */}
            <div
              className="h-16 rounded-lg border border-border flex items-center justify-center"
              style={{ backgroundColor: isValidHex(draft) ? draft : "#3b82f6" }}
            >
              <span className="text-xs font-medium text-white drop-shadow-sm">
                Preview
              </span>
            </div>

            {/* Preset swatches */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Presets
              </p>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft(c)}
                    className="h-7 w-7 rounded-full flex items-center justify-center border border-border/50 transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {draft.toLowerCase() === c.toLowerCase() && (
                      <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom color: native picker + hex input side by side */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Custom
              </p>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={isValidHex(draft) ? draft : "#3b82f6"}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-9 w-9 rounded-md border border-border bg-transparent cursor-pointer p-0.5 flex-shrink-0"
                />
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="#3b82f6"
                  className="bg-input border-border font-mono text-sm flex-1"
                />
              </div>
            </div>

            <Button
              onClick={confirm}
              disabled={!isValidHex(draft)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Select color
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function OrgSettingsManager() {
  const { org, loading, update } = useOrgSettings();
  const [form, setForm] = useState<Partial<OrganizationSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (org) setForm(org.settings);
  }, [org]);

  const handleChange = (field: keyof OrganizationSettings, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(form);
      setSaved(true);
      setDirty(false);
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
    <div className="h-full w-full bg-background flex flex-col relative">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">
          Workspace Settings
        </h1>
        <p className="text-muted-foreground">
          {org.name} &middot; <span className="font-mono">{org.slug}</span>
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {/* pb-24 leaves clearance so the floating save button never covers content */}
        <div className="max-w-5xl mx-auto px-8 py-8 space-y-6 pb-24">
          <EmbedSnippet slug={org.slug} position={org.settings.widgetPosition || "bottom-right"} />

          {/* Two cards side by side on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
                    <ColorPickerField
                      value={form.widgetColor ?? "#3b82f6"}
                      onChange={(v) => handleChange("widgetColor", v)}
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
          </div>

          {/* Fallback — full width below */}
          <Card className="border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Fallback
              </h2>
            </div>
            <div className="max-w-md">
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
        </div>
      </div>

      {/* Floating save button — always reachable, no scrolling to the bottom */}
      <div className="absolute bottom-6 right-8 flex items-center gap-3">
        {saved && !dirty && (
          <span className="text-sm text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
            Saved ✓
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          size="lg"
          className="gap-2 bg-primary hover:bg-primary/90 shadow-xl disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}