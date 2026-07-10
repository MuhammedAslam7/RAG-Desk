"use client";
import { useRef } from "react";

function exec(cmd: string) {
  document.execCommand(cmd, false);
}

export default function RichTextEditor({
  onChange,
}: {
  onChange: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const sync = () => onChange(ref.current?.innerText ?? "");

  const Btn = ({ cmd, label }: { cmd: string; label: string }) => (
    <button
      type="button"
      className="btn btn-ghost px-2.5 py-1 text-sm"
      onMouseDown={(e) => {
        e.preventDefault();
        exec(cmd);
        sync();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-1 border-b px-2 py-1.5"
           style={{ borderColor: "var(--border)" }}>
        <Btn cmd="bold" label="B" />
        <Btn cmd="italic" label="I" />
        <Btn cmd="insertUnorderedList" label="• List" />
        <Btn cmd="insertOrderedList" label="1. List" />
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={sync}
        className="min-h-40 px-4 py-3 text-[0.9375rem] leading-relaxed focus:outline-none"
        style={{ color: "var(--text)" }}
        suppressContentEditableWarning
      />
    </div>
  );
}