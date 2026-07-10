"use client";
import { useState } from "react";
import { useFacts } from "@/hooks/use-facts";

export default function FactsManager() {
  const { facts, create, update, remove } = useFacts();
  const [subject, setSubject] = useState("");
  const [value, setValue] = useState("");

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Facts</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await create(subject, value);
          setSubject("");
          setValue("");
        }}
        className="flex gap-2"
      >
        <input className="border rounded px-2 py-1 flex-1" placeholder="subject"
          value={subject} onChange={(e) => setSubject(e.target.value)} />
        <input className="border rounded px-2 py-1 flex-1" placeholder="value"
          value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="px-3 py-1 rounded bg-blue-600 text-white">Add</button>
      </form>

      <ul className="space-y-2">
        {facts.map((f) => (
          <li key={f.id} className="flex items-center gap-2 border-b py-2">
            <span className="font-medium w-40">{f.subject}</span>
            <input
              className="border rounded px-2 py-1 flex-1"
              defaultValue={f.value}
              onBlur={(e) => e.target.value !== f.value && update(f.id, e.target.value)}
            />
            <button className="text-red-600" onClick={() => remove(f.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}