// frontend/app/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ArrowRight,
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
} from "lucide-react";

const INDUSTRIES = [
  "SaaS", "E-commerce", "Healthcare", "Finance", "Education",
  "Real Estate", "Hospitality", "Manufacturing", "Other",
];
const COUNTRIES = [
  "United States", "India", "United Kingdom", "Canada", "Australia",
  "Germany", "United Arab Emirates", "Singapore", "Other",
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ml", label: "Malayalam" },
  { value: "hi", label: "Hindi" },
];

interface FormState {
  org_name: string;
  website_url: string;
  industry: string;
  contact_email: string;
  phone: string;
  country: string;
  timezone: string;
  language: string;
}

function Field({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}

const selectClass =
  "w-full h-10 rounded-md bg-input border border-border px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring transition-colors";

export default function Onboarding() {
  const [form, setForm] = useState<FormState>({
    org_name: "",
    website_url: "",
    industry: "",
    contact_email: "",
    phone: "",
    country: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: "en",
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

  const missingFields = () => {
    const missing: string[] = [];
    if (!form.org_name.trim()) missing.push("Organization name");
    if (!form.website_url.trim()) missing.push("Website URL");
    if (!form.industry) missing.push("Industry");
    if (!form.contact_email.trim()) missing.push("Contact email");
    if (!form.country) missing.push("Country/Region");
    if (!form.language) missing.push("Preferred language");
    return missing;
  };

  const submit = async () => {
    const missing = missingFields();
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
        const token = await (window as any).Clerk?.session?.getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/org/upload-logo`,
          {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: fd,
          }
        );
        if (!res.ok) throw new Error("Logo upload failed");
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
    if (e.key === "Enter" && !loading) submit();
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center justify-center bg-background px-6 py-8">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-xl font-bold text-white">RD</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Set up your workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Tell us about your business so we can tailor your AI assistant.
          </p>
        </div>

        <Card
          className="border-border bg-card p-8 md:p-10"
          onKeyDown={handleKeyDown}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {/* ---- Left column: identity + business ---- */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Organization identity
                </h2>
              </div>

              <div className="flex gap-4 items-start">
                <label
                  htmlFor="logo-upload"
                  className="group relative h-20 w-20 flex-shrink-0 rounded-xl border border-dashed border-border bg-secondary/40 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/50 transition-colors"
                >
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleLogoSelect}
                />

                <div className="flex-1 min-w-0">
                  <Field label="Organization Name" required icon={Building2}>
                    <Input
                      value={form.org_name}
                      onChange={(e) => set("org_name", e.target.value)}
                      placeholder="Acme Inc."
                      autoFocus
                      className="bg-input border-border h-10 text-sm"
                    />
                  </Field>
                  {logoPreview ? (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" /> Remove logo
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">
                      Optional logo · square images work best
                    </p>
                  )}
                </div>
              </div>

              <Field label="Website URL" required icon={Globe}>
                <Input
                  value={form.website_url}
                  onChange={(e) => set("website_url", e.target.value)}
                  placeholder="https://example.com"
                  className="bg-input border-border h-10 text-sm"
                />
              </Field>

              <div className="h-px bg-border" />

              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Business details
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* ---- Right column: contact + location ---- */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Contact &amp; location
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Email" required icon={Mail}>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => set("contact_email", e.target.value)}
                    placeholder="you@company.com"
                    className="bg-input border-border h-10 text-sm"
                  />
                </Field>

                <Field label="Phone Number" icon={Phone}>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="bg-input border-border h-10 text-sm"
                  />
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
              </div>
              <p className="text-xs text-muted-foreground">
                Timezone auto-detected from your browser — adjust if needed.
              </p>

              <div className="h-px bg-border" />

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                onClick={submit}
                disabled={loading}
                size="lg"
                className="w-full gap-2 bg-primary hover:bg-primary/90 h-12 text-sm font-semibold"
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

              <p className="text-center text-xs text-muted-foreground">
                You can invite teammates and fine-tune your AI assistant after this step.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}