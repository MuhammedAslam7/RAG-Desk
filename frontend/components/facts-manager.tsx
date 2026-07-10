"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Check, Clock, AlertCircle } from "lucide-react";

interface Fact {
  id: string;
  title: string;
  content: string;
  category: string;
  status: "verified" | "pending" | "disputed";
  createdAt: Date;
  priority: "high" | "medium" | "low";
}

export default function FactsManager() {
  const [facts, setFacts] = useState<Fact[]>([
    {
      id: "1",
      title: "Our product price is $99/month",
      content: "The standard subscription costs $99 per month with all features included",
      category: "Pricing",
      status: "verified",
      createdAt: new Date(Date.now() - 86400000),
      priority: "high",
    },
    {
      id: "2",
      title: "Support hours are 9-5 EST",
      content: "Customer support is available Monday-Friday from 9 AM to 5 PM Eastern Standard Time",
      category: "Support",
      status: "verified",
      createdAt: new Date(Date.now() - 172800000),
      priority: "medium",
    },
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    priority: "medium" as const,
  });

  const handleAddOrUpdate = () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (editingId) {
      setFacts((prev) =>
        prev.map((f) =>
          f.id === editingId
            ? { ...f, ...formData, status: "pending" as const }
            : f
        )
      );
      setEditingId(null);
    } else {
      const newFact: Fact = {
        id: Date.now().toString(),
        ...formData,
        status: "pending",
        createdAt: new Date(),
      };
      setFacts((prev) => [newFact, ...prev]);
    }

    setFormData({ title: "", content: "", category: "", priority: "medium" });
    setIsOpen(false);
  };

  const handleEdit = (fact: Fact) => {
    setFormData({
      title: fact.title,
      content: fact.content,
      category: fact.category,
      priority: fact.priority,
    });
    setEditingId(fact.id);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    setFacts((prev) => prev.filter((f) => f.id !== id));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <Check className="h-4 w-4 text-primary" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "disputed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-primary/10 text-primary";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "disputed":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500";
      case "low":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-secondary";
    }
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
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    title: "",
                    content: "",
                    category: "",
                    priority: "medium",
                  });
                }}
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
                    Fact Title
                  </label>
                  <Input
                    placeholder="e.g., Our product price is $99/month"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Detailed Explanation
                  </label>
                  <Textarea
                    placeholder="Provide detailed information about this fact..."
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="bg-input border-border min-h-32"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Category
                    </label>
                    <Input
                      placeholder="e.g., Pricing, Support, Features"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value,
                        })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={handleAddOrUpdate}
                  disabled={!formData.title.trim() || !formData.content.trim()}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {editingId ? "Update Fact" : "Add Fact"}
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
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    Add First Fact
                  </Button>
                </DialogTrigger>
              </Dialog>
            </Card>
          ) : (
            <div className="space-y-3">
              {facts.map((fact) => (
                <Card
                  key={fact.id}
                  className="border-border bg-card/50 hover:bg-card transition-all p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground mb-1">
                        {fact.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {fact.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(fact)}
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

                  <div className="flex items-center flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      className={`${getStatusColor(fact.status)} gap-1.5 border-0`}
                    >
                      {getStatusIcon(fact.status)}
                      <span className="capitalize text-xs">{fact.status}</span>
                    </Badge>

                    {fact.category && (
                      <Badge
                        variant="outline"
                        className="border-border text-foreground text-xs"
                      >
                        {fact.category}
                      </Badge>
                    )}

                    <Badge
                      variant="secondary"
                      className={`${getPriorityColor(fact.priority)} border-0 text-xs`}
                    >
                      {fact.priority === "high" && "🔴"}
                      {fact.priority === "medium" && "🟡"}
                      {fact.priority === "low" && "🔵"}
                      <span className="capitalize ml-1">{fact.priority}</span>
                    </Badge>

                    <span className="text-xs text-muted-foreground ml-auto">
                      {fact.createdAt.toLocaleDateString()}
                    </span>
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
