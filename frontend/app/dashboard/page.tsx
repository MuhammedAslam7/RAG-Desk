import Link from "next/link";

const ACTIONS = [
  { href: "/dashboard/knowledge", title: "Add knowledge", body: "Upload docs, import FAQs, or crawl a site so your AI has something to answer from." },
  { href: "/dashboard/facts", title: "Set verified facts", body: "Pin current truths the AI should always trust over older documents." },
  { href: "/", title: "Test the chat", body: "Ask a question and see how the assistant answers from your knowledge." },
];

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-[0.9375rem]" style={{ color: "var(--text-muted)" }}>
        Here's where to pick up.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href}
                className="card group flex items-start justify-between gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-md)]">
            <div>
              <p className="font-semibold">{a.title}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{a.body}</p>
            </div>
            <span aria-hidden className="mt-1 text-lg transition-transform group-hover:translate-x-0.5"
                  style={{ color: "var(--accent)" }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}