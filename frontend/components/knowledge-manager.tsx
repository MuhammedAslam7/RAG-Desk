"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  HelpCircle,
  Grid3x3,
  Globe,
  Trash2,
  Check,
  Loader2,
  Plus,
} from "lucide-react";

type Method = "upload" | "paste" | "faq" | "faqcsv" | "crawl";

const METHODS: { id: Method; label: string; hint: string; icon: any }[] = [
  { id: "upload", label: "Upload file", hint: "PDF, DOCX, CSV, TXT", icon: Upload },
  { id: "paste", label: "Paste text", hint: "Plain text content", icon: FileText },
  { id: "faq", label: "Add FAQ", hint: "Q&A pair", icon: HelpCircle },
  { id: "faqcsv", label: "Import CSV", hint: "Bulk import", icon: Grid3x3 },
  { id: "crawl", label: "Crawl website", hint: "Fetch pages", icon: Globe },
];

interface KnowledgeSource {
  id: string;
  title: string;
  type: string;
  status: "success" | "processing" | "error";
  timestamp: Date;
  size?: number;
}

export default function KnowledgeManager() {
  const [method, setMethod] = useState<Method>("upload");
  const [sources, setSources] = useState<KnowledgeSource[]>([
    {
      id: "1",
      title: "Product Documentation",
      type: "PDF",
      status: "success",
      timestamp: new Date(Date.now() - 86400000),
      size: 2.5,
    },
    {
      id: "2",
      title: "FAQ Export",
      type: "CSV",
      status: "success",
      timestamp: new Date(Date.now() - 172800000),
      size: 0.5,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    url: "",
  });

  const handleAdd = async () => {
    setIsLoading(true);
    setTimeout(() => {
      const newSource: KnowledgeSource = {
        id: Date.now().toString(),
        title: formData.title || `New ${method}`,
        type: method.toUpperCase(),
        status: "success",
        timestamp: new Date(),
        size: Math.random() * 10,
      };
      setSources((prev) => [newSource, ...prev]);
      setFormData({ title: "", content: "", url: "" });
      setIsLoading(false);
    }, 1500);
  };

  const handleRemove = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Add documents, FAQs, and content your AI will use to answer questions
        </p>
      </div>

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
                          ? "bg-primary/10 border-primary text-foreground"
                          : "bg-card border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
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
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Drag and drop files here
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        or click to browse (PDF, DOCX, CSV, TXT)
                      </p>
                      <Button size="sm" variant="outline">
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
                      onClick={handleAdd}
                      disabled={!formData.content.trim() || isLoading}
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      {isLoading ? (
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
                      onClick={handleAdd}
                      disabled={!formData.content.trim() || !formData.title.trim() || isLoading}
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      {isLoading ? (
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
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Grid3x3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Upload CSV file
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Format: question, answer (one per row)
                      </p>
                      <Button size="sm" variant="outline">
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
                      onClick={handleAdd}
                      disabled={!formData.url.trim() || isLoading}
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      {isLoading ? (
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
                  Knowledge Sources ({sources.length})
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
                              source.status === "success"
                                ? "bg-primary/10"
                                : source.status === "processing"
                                ? "bg-yellow-500/10"
                                : "bg-destructive/10"
                            }`}
                          >
                            {source.status === "success" && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                            {source.status === "processing" && (
                              <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {source.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {source.timestamp.toLocaleDateString()} •{" "}
                              <Badge
                                variant="secondary"
                                className="text-xs font-medium"
                              >
                                {source.type}
                              </Badge>
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(source.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
