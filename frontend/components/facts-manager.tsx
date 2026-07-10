"use client";
import { useState } from "react";
import { useFacts } from "@/hooks/use-facts";

export default function FactsManager() {
  const { facts, create, update, remove } = useFacts();
  const [subject, setSubject] = useState("");
  const [value, setValue] = useState("");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Facts</h1>
        <p className="mt-1 text-[0.9375rem]" style={{ color: "var(--text-muted)" }}>
          Verified truths the AI trusts above everything else. Great for prices, hours, policies.
        </p>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); create(subject, value); setSubject(""); setValue(""); }}
        className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="label">Subject</label>
          <input className="input" placeholder="support email" value={subject}
                 onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="label">Value</label>
          <input className="input" placeholder="help@acme.com" value={value}
                 onChange={(e) => setValue(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={!subject.trim() || !value.trim()}>Add</button>
      </form>

      {facts.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-medium">No facts yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Add one above. Facts override anything conflicting in your documents.
          </p>
        </div>
      ) : (
        <ul className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {facts.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <span className="w-40 shrink-0 font-medium">{f.subject}</span>
              <input
                className="input flex-1"
                defaultValue={f.value}
                onBlur={(e) => e.target.value !== f.value && update(f.id, e.target.value)}
              />
              <button className="btn btn-danger px-2.5 py-1 text-sm" onClick={() => remove(f.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}