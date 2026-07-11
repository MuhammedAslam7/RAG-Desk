"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { useFacts } from "@/hooks/use-facts";
import { Fact } from "@/types";

export default function FactsManager() {
  const { facts, create, update, remove } = useFacts();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ subject: "", value: "" });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ subject: "", value: "" });
    setIsOpen(true);
  };

  const openEdit = (fact: Fact) => {
    setEditingId(fact.id);
    setFormData({ subject: fact.subject, value: fact.value });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.subject.trim() || !formData.value.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await update(editingId, formData.value);
      } else {
        await create(formData.subject, formData.value);
      }
      setFormData({ subject: "", value: "" });
      setEditingId(null);
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Verified Facts
            </h1>
            <p className="text-muted-foreground">
              Pin important information your AI should always trust over documents
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCreate}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add Fact
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingId ? "Edit Fact" : "Add New Fact"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingId
                    ? "Update this verified fact that your AI should trust"
                    : "Add a new fact that your AI should always consider accurate"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Subject
                  </label>
                  <Input
                    placeholder="e.g., pricing, support-hours"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    disabled={!!editingId}
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Value
                  </label>
                  <Textarea
                    placeholder="Provide the current, accurate information..."
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                    className="bg-input border-border min-h-32"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={
                    !formData.subject.trim() || !formData.value.trim() || saving
                  }
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    "Update Fact"
                  ) : (
                    "Add Fact"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {facts.length === 0 ? (
            <Card className="border-border bg-card/50 p-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No facts added yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Add verified facts that your AI should always trust
              </p>
              <Button
                onClick={openCreate}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add First Fact
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {facts.map((fact) => (
                <Card
                  key={fact.id}
                  className="border-border bg-card/50 hover:bg-card transition-all p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground mb-1 capitalize">
                        {fact.subject}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {fact.value}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        Added {new Date(fact.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(fact)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(fact.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}