// frontend/app/onboarding/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Building2,
  Globe,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Clock,
  Languages,
  AlertCircle,
  X,
  Check,
  Target,
  Headset,
  Zap,
  Bot,
  ShoppingBag,
  Sparkles,
  MessageCircle,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Static option sets (benchmarked against Intercom / Crisp / Tidio)  */
/* ------------------------------------------------------------------ */

const INDUSTRIES = [
  "SaaS",
  "E-commerce",
  "Healthcare",
  "Finance",
  "Education",
  "Real Estate",
  "Hospitality",
  "Manufacturing",
  "Other",
];

const COUNTRIES = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "United Arab Emirates",
  "Singapore",
  "Other",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ml", label: "Malayalam" },
  { value: "hi", label: "Hindi" },
];

const TEAM_SIZES = ["1–10", "11–50", "51–200", "200+"];

const USE_CASES = [
  {
    value: "support",
    label: "Customer support",
    description: "Answer questions and resolve tickets",
    icon: Headset,
  },
  {
    value: "sales",
    label: "Sales & lead gen",
    description: "Capture and qualify leads 24/7",
    icon: Zap,
  },
  {
    value: "faq",
    label: "FAQ automation",
    description: "Deflect repetitive questions instantly",
    icon: Bot,
  },
  {
    value: "ecommerce",
    label: "E-commerce help",
    description: "Order status, returns and shipping",
    icon: ShoppingBag,
  },
  {
    value: "internal",
    label: "Internal knowledge",
    description: "Help your own team find answers",
    icon: Sparkles,
  },
];

const CHANNELS = [
  { value: "widget", label: "Website widget", icon: Globe },
  { value: "email", label: "Email", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "messenger", label: "Messenger", icon: Send },
  { value: "phone", label: "Phone", icon: Phone },
];

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

interface FormState {
  org_name: string;
  brand_name: string;
  website_url: string;
  industry: string;
  team_size: string;
  contact_email: string;
  phone: string;
  country: string;
  timezone: string;
  language: string;
  primary_use_case: string;
  support_channels: string[];
}

const STEPS = [
  { id: 0, label: "Workspace", icon: Building2 },
  { id: 1, label: "Business", icon: Briefcase },
  { id: 2, label: "Goals", icon: Target },
  { id: 3, label: "Contact", icon: Mail },
];

const selectClass =
  "w-full h-10 rounded-md bg-input border border-border px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring transition-colors";

function Field({
  label,
  required,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: LucideIcon;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    org_name: "",
    brand_name: "",
    website_url: "",
    industry: "",
    team_size: "",
    contact_email: "",
    phone: "",
    country: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: "en",
    primary_use_case: "",
    support_channels: ["widget"],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (error) setError("");
  };

  const toggleChannel = (c: string) => {
    setForm((f) => ({
      ...f,
      support_channels: f.support_channels.includes(c)
        ? f.support_channels.filter((x) => x !== c)
        : [...f.support_channels, c],
    }));
    if (error) setError("");
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
  };

  /* ---------------- per-step validation ---------------- */

  const stepErrors = (s: number): string[] => {
    const missing: string[] = [];
    if (s === 0) {
      if (!form.org_name.trim()) missing.push("Organization name");
    }
    if (s === 1) {
      if (!form.website_url.trim()) missing.push("Website URL");
      if (!form.industry) missing.push("Industry");
      if (!form.team_size) missing.push("Team size");
      if (!form.country) missing.push("Country/Region");
    }
    if (s === 2) {
      if (!form.primary_use_case) missing.push("Primary use case");
      if (form.support_channels.length === 0) missing.push("At least one support channel");
    }
    if (s === 3) {
      if (!form.contact_email.trim()) missing.push("Contact email");
    }
    return missing;
  };

  const next = () => {
    const missing = stepErrors(step);
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  /* ---------------- submit ---------------- */

  const submit = async () => {
    const missing = stepErrors(3);
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let logo_url: string | undefined;
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const res = await apiUpload("/api/v1/org/upload-logo", fd);
        const data = await res.json();
        logo_url = `${process.env.NEXT_PUBLIC_API_URL}${data.url}`;
      }

      await apiFetch("/api/v1/org/onboard", {
        method: "POST",
        body: JSON.stringify({ ...form, logo_url }),
      });
      router.push("/overview");
    } catch {
      setError("Failed to create organization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Let buttons/selects handle Enter themselves to avoid double-firing
    const target = e.target as HTMLElement;
    if (target.closest("button, select")) return;
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      if (step === STEPS.length - 1) submit();
      else next();
    }
  };

  /* ---------------- summary for final step ---------------- */

  const summary = useMemo(() => {
    const useCase = USE_CASES.find((u) => u.value === form.primary_use_case);
    const channelLabels = CHANNELS.filter((c) =>
      form.support_channels.includes(c.value)
    ).map((c) => c.label);
    return [
      { label: "Organization", value: form.org_name || "—" },
      { label: "Brand name", value: form.brand_name || form.org_name || "—" },
      { label: "Website", value: form.website_url || "—" },
      { label: "Industry", value: form.industry || "—" },
      { label: "Team size", value: form.team_size || "—" },
      { label: "Use case", value: useCase?.label || "—" },
      { label: "Channels", value: channelLabels.join(", ") || "—" },
      { label: "Country", value: form.country || "—" },
      { label: "Timezone", value: form.timezone || "—" },
      {
        label: "Language",
        value: LANGUAGES.find((l) => l.value === form.language)?.label || "—",
      },
    ];
  }, [form]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-3xl">
        {/* ---- Header ---- */}
        {/* <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-xl font-bold text-white">RD</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Set up your workspace
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We&apos;ll tailor your AI assistant to your business — this takes
            under a minute.
          </p>
        </div> */}

        {/* ---- Step indicator ---- */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs font-medium text-foreground">
              {STEPS[step].label}
            </span>
          </div>
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => i < step && setStep(i)}
                    className={`flex items-center gap-2 ${
                      i < step ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${
                        done
                          ? "bg-primary border-primary text-white"
                          : active
                            ? "border-primary text-primary bg-primary/10 ring-4 ring-primary/15"
                            : "border-border text-muted-foreground bg-card"
                      }`}
                    >
                      {done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <s.icon className="h-4 w-4" />
                      )}
                    </span>
                    <span
                      className={`hidden sm:block text-xs font-medium ${
                        active
                          ? "text-foreground"
                          : done
                            ? "text-foreground/70"
                            : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 rounded-full transition-colors ${
                        i < step ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- Form card ---- */}
        <Card
          className="border-border bg-card p-8 md:p-10 shadow-xl shadow-black/5"
          onKeyDown={handleKeyDown}
        >
          {/* STEP 0 — workspace identity */}
          {step === 0 && (
            <div className="animate-[widget-fade-in_200ms_ease-out] space-y-7">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Workspace identity
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This is how your workspace appears to you and your customers.
                </p>
              </div>

              <div className="flex gap-5 items-start">
                <label
                  htmlFor="logo-upload"
                  className="group relative h-24 w-24 flex-shrink-0 rounded-2xl border border-dashed border-border bg-secondary/40 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/50 transition-colors"
                >
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors mx-auto mb-1" />
                      <span className="text-[10px] text-muted-foreground">Logo</span>
                    </div>
                  )}
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleLogoSelect}
                />

                <div className="flex-1 min-w-0 space-y-4">
                  <Field label="Organization name" required>
                    <Input
                      value={form.org_name}
                      onChange={(e) => set("org_name", e.target.value)}
                      placeholder="Acme Inc."
                      autoFocus
                      className="bg-input border-border h-10 text-sm"
                    />
                  </Field>
                  <Field
                    label="Customer-facing brand name"
                    icon={Globe}
                    hint="Shown to visitors in the chat widget. Defaults to your organization name."
                  >
                    <Input
                      value={form.brand_name}
                      onChange={(e) => set("brand_name", e.target.value)}
                      placeholder="Acme Support"
                      className="bg-input border-border h-10 text-sm"
                    />
                  </Field>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" /> Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — business details */}
          {step === 1 && (
            <div className="animate-[widget-fade-in_200ms_ease-out] space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Business details
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Helps us tailor responses to your customers and region.
                </p>
              </div>

              <Field label="Website URL" required icon={Globe}>
                <Input
                  value={form.website_url}
                  onChange={(e) => set("website_url", e.target.value)}
                  placeholder="https://example.com"
                  className="bg-input border-border h-10 text-sm"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Industry" required icon={Briefcase}>
                  <select
                    value={form.industry}
                    onChange={(e) => set("industry", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select…</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Country / Region" required icon={MapPin}>
                  <select
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Timezone" icon={Clock}>
                  <Input
                    value={form.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                    className="bg-input border-border h-10 text-sm font-mono"
                  />
                </Field>

                <Field label="Language" required icon={Languages}>
                  <select
                    value={form.language}
                    onChange={(e) => set("language", e.target.value)}
                    className={selectClass}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field
                label="Team size"
                required
                icon={Users}
                hint="Helps us right-size suggestions for your support volume."
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TEAM_SIZES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        set("team_size", t);
                        if (error) setError("");
                      }}
                      className={`h-10 rounded-md border text-sm font-medium transition-all ${
                        form.team_size === t
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                          : "border-border bg-input text-foreground hover:border-primary/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <p className="text-xs text-muted-foreground">
                Timezone auto-detected from your browser — adjust if needed.
              </p>
            </div>
          )}

          {/* STEP 2 — goals & channels */}
          {step === 2 && (
            <div className="animate-[widget-fade-in_200ms_ease-out] space-y-7">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Goals &amp; channels
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  What will your AI assistant help with most?
                </p>
              </div>

              <Field label="Primary use case" required>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {USE_CASES.map((u) => {
                    const selected = form.primary_use_case === u.value;
                    return (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => {
                          set("primary_use_case", u.value);
                          if (error) setError("");
                        }}
                        className={`relative text-left p-4 rounded-xl border transition-all ${
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-input hover:border-primary/40"
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <u.icon
                          className={`h-5 w-5 mb-2 ${
                            selected ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <p className="text-sm font-semibold text-foreground">
                          {u.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {u.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field
                label="Support channels"
                required
                hint="Pick where your customers will reach you. You can change this later."
              >
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((c) => {
                    const selected = form.support_channels.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => toggleChannel(c.value)}
                        className={`inline-flex items-center gap-2 px-3.5 h-10 rounded-full border text-sm font-medium transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "border-border bg-input text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <c.icon className="h-4 w-4" />
                        {c.label}
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {/* STEP 3 — contact & review */}
          {step === 3 && (
            <div className="animate-[widget-fade-in_200ms_ease-out] space-y-7">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Contact &amp; review
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Where should we send notifications and escalated chats?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contact email" required icon={Mail}>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => set("contact_email", e.target.value)}
                    placeholder="you@company.com"
                    className="bg-input border-border h-10 text-sm"
                  />
                </Field>
                <Field label="Phone number" icon={Phone}>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="bg-input border-border h-10 text-sm"
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Review your setup
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {summary.map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <span className="text-xs font-medium text-foreground text-right truncate max-w-[55%]">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ---- Error (non-final steps) ---- */}
          {step < 3 && error && (
            <div className="mt-6 flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* ---- Footer actions ---- */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={back}
              disabled={step === 0 || loading}
              className="gap-2 h-11 px-5 text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={next}
                size="lg"
                className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 text-sm font-semibold"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={loading}
                size="lg"
                className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 text-sm font-semibold min-w-44"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating workspace…
                  </>
                ) : (
                  <>
                    Create Organization <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>

          {step === STEPS.length - 1 && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              You can invite teammates and fine-tune your AI assistant after this step.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
