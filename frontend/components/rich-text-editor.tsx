"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  ListOrdered,
  Code,
  Heading2,
  MoreHorizontal,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  minHeight = "h-64",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const clearFormatting = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      editorRef.current.innerHTML = text;
      onChange(text);
    }
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border bg-secondary/50 px-4 py-3 flex items-center gap-1 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormat("bold")}
          title="Bold"
          className="h-8 w-8 p-0 hover:bg-secondary"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormat("italic")}
          title="Italic"
          className="h-8 w-8 p-0 hover:bg-secondary"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormat("underline")}
          title="Underline"
          className="h-8 w-8 p-0 hover:bg-secondary"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormat("insertUnorderedList")}
          title="Bullet List"
          className="h-8 w-8 p-0 hover:bg-secondary"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormat("insertOrderedList")}
          title="Numbered List"
          className="h-8 w-8 p-0 hover:bg-secondary"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormat("formatBlock", "<h2>")}
          title="Heading"
          className="h-8 w-8 p-0 hover:bg-secondary"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormat("createLink", prompt("Enter URL:"))}
          title="Link"
          className="h-8 w-8 p-0 hover:bg-secondary"
        >
          <Link2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormat("formatBlock", "<code>")}
          title="Code"
          className="h-8 w-8 p-0 hover:bg-secondary"
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              title="More options"
              className="h-8 w-8 p-0 hover:bg-secondary"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={() => applyFormat("indent")}>
              Indent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyFormat("outdent")}>
              Outdent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyFormat("justifyLeft")}>
              Align Left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyFormat("justifyCenter")}>
              Align Center
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyFormat("justifyRight")}>
              Align Right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={clearFormatting}>
              Clear Formatting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        suppressContentEditableWarning
        className={`${minHeight} w-full px-4 py-4 outline-none text-foreground text-sm leading-relaxed overflow-auto bg-background placeholder-text-muted-foreground focus:outline-none ${
          !value && !isEditing ? "text-muted-foreground" : ""
        }`}
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {!value && !isEditing && placeholder}
      </div>

      {/* Character count */}
      <div className="border-t border-border bg-secondary/50 px-4 py-2 text-xs text-muted-foreground">
        {value?.replace(/<[^>]*>/g, "").length || 0} characters
      </div>
    </Card>
  );
}

export function RichTextPreview({ html }: { html: string }) {
  return (
    <Card className="border-border bg-card p-6">
      <ScrollArea className="h-64">
        <div
          className="prose prose-invert max-w-none text-foreground text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </ScrollArea>
    </Card>
  );
}
