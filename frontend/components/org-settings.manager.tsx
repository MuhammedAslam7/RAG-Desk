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
import {
  Loader2,
  Save,
  Globe,
  MessageSquare,
  Palette,
  Check,
  LayoutTemplate,
  Hand,
  Zap,
  MessagesSquare,
  Bot,
  ClipboardList,
} from "lucide-react";
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

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto (match visitor's device)" },
];

const WIDTHS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const HEIGHTS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const RADII = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "full", label: "Fully rounded" },
];

const FONTS = [
  { value: "inter", label: "Inter" },
  { value: "roboto", label: "Roboto" },
  { value: "poppins", label: "Poppins" },
  { value: "system", label: "System font" },
];

const ANIMATIONS = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "bounce", label: "Bounce" },
  { value: "none", label: "None" },
];

const STATUS_TEXTS = [
  { value: "online", label: "Online" },
  { value: "instant", label: "Usually replies instantly" },
  { value: "ai_assistant", label: "AI Assistant" },
];

const RESPONSE_LENGTHS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "detailed", label: "Detailed" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
];

const EMOJI_USAGE = [
  { value: "none", label: "None" },
  { value: "moderate", label: "Moderate" },
  { value: "frequent", label: "Frequent" },
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
  label = "Color",
  allowClear = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  allowClear?: boolean;
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
        <span className="font-mono text-xs">{value || "default"}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-card sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-foreground">{label}</DialogTitle>
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

            <div className="flex gap-2">
              {allowClear && (
                <Button
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Use default
                </Button>
              )}
              <Button
                onClick={confirm}
                disabled={!isValidHex(draft)}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Select color
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToggleField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full h-9 rounded-md border border-border bg-input/20 px-3 flex items-center justify-between text-sm text-foreground hover:border-primary/50 transition-colors"
    >
      <span>{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

type FormValue = string | number | boolean | null | undefined;

export default function OrgSettingsManager() {
  const { org, loading, update } = useOrgSettings();
  const [form, setForm] = useState<Partial<OrganizationSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (org) setForm(org.settings);
  }, [org]);

  const handleChange = (field: keyof OrganizationSettings, value: FormValue) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
    setDirty(true);
  };

  const handleToggle = (field: keyof OrganizationSettings, value: boolean) => {
    handleChange(field, value);
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
            <Card className="border-border bg-card p-6 lg:col-span-2">
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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Theme
                    </label>
                    <select
                      value={form.theme ?? "auto"}
                      onChange={(e) => handleChange("theme", e.target.value)}
                      className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                    >
                      {THEMES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Accent color
                    </label>
                    <ColorPickerField
                      value={form.widgetColor ?? "#3b82f6"}
                      onChange={(v) => handleChange("widgetColor", v)}
                      label="Accent color"
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
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Chat window width
                    </label>
                    <select
                      value={form.widgetWidth ?? "medium"}
                      onChange={(e) => handleChange("widgetWidth", e.target.value)}
                      className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                    >
                      {WIDTHS.map((w) => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Chat window height
                    </label>
                    <select
                      value={form.widgetHeight ?? "medium"}
                      onChange={(e) => handleChange("widgetHeight", e.target.value)}
                      className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                    >
                      {HEIGHTS.map((h) => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Border radius
                    </label>
                    <select
                      value={form.borderRadius ?? "rounded"}
                      onChange={(e) => handleChange("borderRadius", e.target.value)}
                      className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                    >
                      {RADII.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Font
                    </label>
                    <select
                      value={form.font ?? "inter"}
                      onChange={(e) => handleChange("font", e.target.value)}
                      className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Animation
                    </label>
                    <select
                      value={form.animation ?? "slide"}
                      onChange={(e) => handleChange("animation", e.target.value)}
                      className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                    >
                      {ANIMATIONS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Shadow
                      </label>
                      <ToggleField
                        checked={form.showShadow ?? true}
                        onChange={(v) => handleToggle("showShadow", v)}
                        label={form.showShadow ?? true ? "Shown" : "Hidden"}
                      />
                    </div>
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
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Header */}
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Header</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Bot name
                  </label>
                  <Input
                    value={form.botName ?? ""}
                    onChange={(e) => handleChange("botName", e.target.value)}
                    placeholder="Support AI"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Status text
                  </label>
                  <select
                    value={form.statusText ?? "instant"}
                    onChange={(e) => handleChange("statusText", e.target.value)}
                    className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                  >
                    {STATUS_TEXTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Bot avatar URL
                  </label>
                  <Input
                    value={form.botAvatarUrl ?? ""}
                    onChange={(e) => handleChange("botAvatarUrl", e.target.value)}
                    placeholder="https://…"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company logo URL
                  </label>
                  <Input
                    value={form.companyLogoUrl ?? ""}
                    onChange={(e) => handleChange("companyLogoUrl", e.target.value)}
                    placeholder="https://…"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Header background color
                  </label>
                  <ColorPickerField
                    value={form.headerBgColor ?? ""}
                    onChange={(v) => handleChange("headerBgColor", v)}
                    label="Header background color"
                    allowClear
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Header text color
                  </label>
                  <ColorPickerField
                    value={form.headerTextColor ?? ""}
                    onChange={(v) => handleChange("headerTextColor", v)}
                    label="Header text color"
                    allowClear
                  />
                </div>
                <ToggleField
                  checked={form.showOnlineStatus ?? true}
                  onChange={(v) => handleToggle("showOnlineStatus", v)}
                  label="Show online status"
                />
                <ToggleField
                  checked={form.showCloseButton ?? true}
                  onChange={(v) => handleToggle("showCloseButton", v)}
                  label="Show close button"
                />
              </div>
            </Card>

            {/* Welcome screen */}
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Hand className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Welcome Screen</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Welcome title
                  </label>
                  <Input
                    value={form.welcomeTitle ?? ""}
                    onChange={(e) => handleChange("welcomeTitle", e.target.value)}
                    placeholder="Hello 👋"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Welcome description
                  </label>
                  <Textarea
                    value={form.welcomeDescription ?? ""}
                    onChange={(e) => handleChange("welcomeDescription", e.target.value)}
                    placeholder="How can I help today?"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Suggested questions (one per line)
                  </label>
                  <Textarea
                    value={form.suggestedQuestions ?? ""}
                    onChange={(e) => handleChange("suggestedQuestions", e.target.value)}
                    placeholder={"Pricing\nRefund\nContact Sales"}
                    className="bg-input border-border min-h-24"
                  />
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start chat button text
                  </label>
                  <Input
                    value={form.startChatButtonText ?? ""}
                    onChange={(e) => handleChange("startChatButtonText", e.target.value)}
                    placeholder="Start Chat"
                    className="bg-input border-border"
                  />
                </div>
              </div>
            </Card>

            {/* Chat behavior */}
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Chat Behavior</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Auto-open after (seconds, blank = off)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form.autoOpenSeconds ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "autoOpenSeconds",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Minimize after inactivity (seconds, blank = off)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form.minimizeAfterInactivitySeconds ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "minimizeAfterInactivitySeconds",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="bg-input border-border"
                  />
                </div>
                <ToggleField
                  checked={form.autoOpenOnScroll ?? false}
                  onChange={(v) => handleToggle("autoOpenOnScroll", v)}
                  label="Auto-open on scroll"
                />
                <ToggleField
                  checked={form.autoOpenOnExitIntent ?? false}
                  onChange={(v) => handleToggle("autoOpenOnExitIntent", v)}
                  label="Auto-open on exit intent"
                />
                <ToggleField
                  checked={form.rememberConversations ?? true}
                  onChange={(v) => handleToggle("rememberConversations", v)}
                  label="Remember previous conversations"
                />
                <ToggleField
                  checked={form.startMinimized ?? true}
                  onChange={(v) => handleToggle("startMinimized", v)}
                  label="Start minimized"
                />
                <ToggleField
                  checked={form.keepOpenAcrossPages ?? false}
                  onChange={(v) => handleToggle("keepOpenAcrossPages", v)}
                  label="Keep widget open after page change"
                />
              </div>
            </Card>

            {/* Messages */}
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <MessagesSquare className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Messages</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    User bubble color
                  </label>
                  <ColorPickerField
                    value={form.userBubbleColor ?? ""}
                    onChange={(v) => handleChange("userBubbleColor", v)}
                    label="User bubble color"
                    allowClear
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Defaults to your accent color when unset.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    AI bubble color
                  </label>
                  <ColorPickerField
                    value={form.aiBubbleColor ?? ""}
                    onChange={(v) => handleChange("aiBubbleColor", v)}
                    label="AI bubble color"
                    allowClear
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Defaults to your card color when unset.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Message text color
                  </label>
                  <ColorPickerField
                    value={form.messageTextColor ?? ""}
                    onChange={(v) => handleChange("messageTextColor", v)}
                    label="Message text color"
                    allowClear
                  />
                </div>
                <div />
                <ToggleField
                  checked={form.showTimestamps ?? false}
                  onChange={(v) => handleToggle("showTimestamps", v)}
                  label="Show timestamps"
                />
                <ToggleField
                  checked={form.showReadReceipts ?? false}
                  onChange={(v) => handleToggle("showReadReceipts", v)}
                  label="Show read receipts"
                />
                <ToggleField
                  checked={form.showTypingIndicator ?? true}
                  onChange={(v) => handleToggle("showTypingIndicator", v)}
                  label="Show typing indicator"
                />
                <ToggleField
                  checked={form.aiThinkingAnimation ?? true}
                  onChange={(v) => handleToggle("aiThinkingAnimation", v)}
                  label="AI thinking animation"
                />
              </div>
            </Card>

            {/* AI Behavior */}
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Bot className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">AI Behavior</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    AI name
                  </label>
                  <Input
                    value={form.aiName ?? ""}
                    onChange={(e) => handleChange("aiName", e.target.value)}
                    placeholder="AI Assistant"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Response length
                  </label>
                  <select
                    value={form.responseLength ?? "medium"}
                    onChange={(e) => handleChange("responseLength", e.target.value)}
                    className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                  >
                    {RESPONSE_LENGTHS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tone
                  </label>
                  <select
                    value={form.tone ?? "friendly"}
                    onChange={(e) => handleChange("tone", e.target.value)}
                    className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                  >
                    {TONES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Emoji usage
                  </label>
                  <select
                    value={form.emojiUsage ?? "moderate"}
                    onChange={(e) => handleChange("emojiUsage", e.target.value)}
                    className="w-full h-9 rounded-md bg-input border border-border px-3 text-sm text-foreground"
                  >
                    {EMOJI_USAGE.map((e2) => (
                      <option key={e2.value} value={e2.value}>{e2.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    AI personality (freeform notes)
                  </label>
                  <Textarea
                    value={form.aiPersonality ?? ""}
                    onChange={(e) => handleChange("aiPersonality", e.target.value)}
                    placeholder="e.g. Speak like a knowledgeable, patient teammate."
                    className="bg-input border-border"
                  />
                </div>
                <ToggleField
                  checked={form.showAiDisclaimer ?? true}
                  onChange={(v) => handleToggle("showAiDisclaimer", v)}
                  label="Show AI disclaimer"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Language is controlled by the Response language field in Widget Appearance above.
              </p>
            </Card>

            {/* Conversation settings */}
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Conversation Settings</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleField
                  checked={form.askVisitorName ?? false}
                  onChange={(v) => handleToggle("askVisitorName", v)}
                  label="Ask visitor name"
                />
                <ToggleField
                  checked={form.askVisitorEmail ?? false}
                  onChange={(v) => handleToggle("askVisitorEmail", v)}
                  label="Ask email before chat"
                />
                <ToggleField
                  checked={form.askVisitorPhone ?? false}
                  onChange={(v) => handleToggle("askVisitorPhone", v)}
                  label="Ask phone number"
                />
                <ToggleField
                  checked={form.requireContactFields ?? false}
                  onChange={(v) => handleToggle("requireContactFields", v)}
                  label="Required fields"
                />
                <ToggleField
                  checked={form.saveVisitorHistory ?? true}
                  onChange={(v) => handleToggle("saveVisitorHistory", v)}
                  label="Save visitor history"
                />
                <ToggleField
                  checked={form.allowAnonymousChat ?? true}
                  onChange={(v) => handleToggle("allowAnonymousChat", v)}
                  label="Allow anonymous chat"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                If any of the fields above are required and anonymous chat is disabled, visitors
                must fill them in before they can send a message.
              </p>
            </Card>

            {/* Security */}
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Website &amp; Security
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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