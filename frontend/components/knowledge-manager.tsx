"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  HelpCircle,
  Grid3x3,
  Globe,
  Trash2,
  Loader2,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useKnowledge } from "@/hooks/use-knowledge";

type Method = "upload" | "paste" | "faq" | "faqcsv" | "crawl";

const METHODS: { id: Method; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "upload", label: "Upload file", hint: "PDF, DOCX, CSV, TXT", icon: Upload },
  { id: "paste", label: "Paste text", hint: "Plain text content", icon: FileText },
  { id: "faq", label: "Add FAQ", hint: "Q&A pair", icon: HelpCircle },
  { id: "faqcsv", label: "Import CSV", hint: "Bulk import", icon: Grid3x3 },
  { id: "crawl", label: "Crawl website", hint: "Fetch pages", icon: Globe },
];

type PendingAdd = {
  label: string;
  title: string;
  detail: string;
  run: () => Promise<void>;
};

const truncate = (s: string, n = 160) =>
  s.length > n ? s.slice(0, n).trimEnd() + "…" : s;

const TYPE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  pdf: { icon: FileText, color: "text-rose-500 bg-rose-500/10" },
  docx: { icon: FileText, color: "text-sky-500 bg-sky-500/10" },
  text: { icon: FileText, color: "text-indigo-500 bg-indigo-500/10" },
  crawl: { icon: Globe, color: "text-emerald-500 bg-emerald-500/10" },
  faq: { icon: HelpCircle, color: "text-amber-500 bg-amber-500/10" },
  csv: { icon: Grid3x3, color: "text-violet-500 bg-violet-500/10" },
};

export default function KnowledgeManager() {
  const {
    sources,
    total,
    busy,
    loadingMore,
    loadMore,
    addText,
    addFaq,
    crawl,
    upload,
    importFaqCsv,
    remove,
  } = useKnowledge();
  const [method, setMethod] = useState<Method>("upload");
  const [formData, setFormData] = useState({ title: "", content: "", url: "" });
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => setFormData({ title: "", content: "", url: "" });

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingAdd({
      label: "Upload file",
      title: file.name,
      detail: `File size: ${(file.size / 1024).toFixed(1)} KB. It will be processed and added to your knowledge base.`,
      run: () => upload(file, formData.title || undefined).then(resetForm),
    });
  };

  const handleCsvSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingAdd({
      label: "Import CSV",
      title: file.name,
      detail: `File size: ${(file.size / 1024).toFixed(1)} KB. Its Q&A rows will be added to your knowledge base.`,
      run: () => importFaqCsv(file),
    });
  };

  const handleAddText = () => {
    if (!formData.content.trim()) return;
    setPendingAdd({
      label: "Paste text",
      title: formData.title || "Untitled",
      detail: truncate(formData.content),
      run: () =>
        addText(formData.title || "Untitled", formData.content).then(resetForm),
    });
  };

  const handleAddFaq = () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    setPendingAdd({
      label: "Add FAQ",
      title: formData.title,
      detail: truncate(formData.content),
      run: () => addFaq(formData.title, formData.content).then(resetForm),
    });
  };

  const handleCrawl = () => {
    if (!formData.url.trim()) return;
    setPendingAdd({
      label: "Crawl website",
      title: formData.url,
      detail:
        "The crawler will fetch pages from this website and add them to your knowledge base.",
      run: () => crawl(formData.url).then(resetForm),
    });
  };

  const confirmAdd = () => {
    const pending = pendingAdd;
    setPendingAdd(null);
    pending?.run();
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      {/* Confirmation Modal */}
      <Dialog
        open={!!pendingAdd}
        onOpenChange={(open) => {
          if (!open) setPendingAdd(null);
        }}
      >
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {pendingAdd ? `Add ${pendingAdd.label}?` : "Add knowledge?"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {pendingAdd?.title}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-foreground/80">{pendingAdd?.detail}</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingAdd(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAdd}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Method Tabs */}
            <div className="lg:col-span-1">
              <div className="space-y-2">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  const isActive = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        isActive
                          ? "bg-primary/10 border-primary/40 text-foreground"
                          : "bg-card border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                        <div>
                          <p className="font-medium text-sm">{m.label}</p>
                          <p className="text-xs opacity-70">{m.hint}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Area */}
            <div className="lg:col-span-3">
              <Card className="border-border bg-card p-6 mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  {METHODS.find((m) => m.id === method)?.label}
                </h2>

                {method === "upload" && (
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.csv,.txt,.md,.markdown"
                      className="hidden"
                      onChange={handleFileSelected}
                    />
                    <div
                      onClick={() => !busy && fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/[0.03] transition-all cursor-pointer"
                    >
                      {busy ? (
                        <Loader2 className="h-12 w-12 text-primary mx-auto mb-3 animate-spin" />
                      ) : (
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      )}
                      <p className="text-sm font-medium text-foreground mb-1">
                        Drag and drop files here
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        or click to browse (PDF, DOCX, CSV, TXT)
                      </p>
                      <Button size="sm" variant="outline" disabled={busy}>
                        Choose Files
                      </Button>
                    </div>
                  </div>
                )}

                {method === "paste" && (
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter a title for this content"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                    <Textarea
                      placeholder="Paste your text content here..."
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      className="bg-input border-border min-h-40"
                    />
                    <Button
                      onClick={handleAddText}
                      disabled={!formData.content.trim() || busy}
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add Content
                    </Button>
                  </div>
                )}

                {method === "faq" && (
                  <div className="space-y-4">
                    <Input
                      placeholder="Question"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                    <Textarea
                      placeholder="Answer"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      className="bg-input border-border min-h-32"
                    />
                    <Button
                      onClick={handleAddFaq}
                      disabled={!formData.content.trim() || !formData.title.trim() || busy}
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add FAQ
                    </Button>
                  </div>
                )}

                {method === "faqcsv" && (
                  <div className="space-y-4">
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvSelected}
                    />
                    <div
                      onClick={() => !busy && csvInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/[0.03] transition-all cursor-pointer"
                    >
                      {busy ? (
                        <Loader2 className="h-12 w-12 text-primary mx-auto mb-3 animate-spin" />
                      ) : (
                        <Grid3x3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      )}
                      <p className="text-sm font-medium text-foreground mb-1">
                        Upload CSV file
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Format: question, answer (one per row)
                      </p>
                      <Button size="sm" variant="outline" disabled={busy}>
                        Choose CSV
                      </Button>
                    </div>
                  </div>
                )}

                {method === "crawl" && (
                  <div className="space-y-4">
                    <Input
                      placeholder="https://example.com"
                      value={formData.url}
                      onChange={(e) =>
                        setFormData({ ...formData, url: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                    <Button
                      onClick={handleCrawl}
                      disabled={!formData.url.trim() || busy}
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Start Crawling
                    </Button>
                  </div>
                )}
              </Card>

              {/* Sources List */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Knowledge Sources ({total})
                </h2>
                <div className="space-y-3">
                  {sources.length === 0 ? (
                    <Card className="border-border bg-card/50 p-8 text-center">
                      <p className="text-muted-foreground">
                        No sources added yet. Start by adding content above.
                      </p>
                    </Card>
                  ) : (
                    sources.map((source) => (
                      <Card
                        key={source.id}
                        className="border-border bg-card/50 p-4 flex items-center justify-between hover:bg-card transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              (TYPE_ICONS[source.type] ?? TYPE_ICONS.text).color
                            }`}
                          >
                            {(() => {
                              const SI = (TYPE_ICONS[source.type] ?? TYPE_ICONS.text)
                                .icon;
                              return <SI className="h-5 w-5" />;
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {source.title}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              {new Date(source.createdAt).toLocaleDateString()} •{" "}
                              <Badge variant="secondary" className="text-xs font-medium">
                                {source.type.toUpperCase()}
                              </Badge>
                              <span>{source.chunkCount} chunks</span>
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(source.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
                {sources.length > 0 && sources.length < total && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="gap-2"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {loadingMore ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}