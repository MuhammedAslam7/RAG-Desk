import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <nav className="flex gap-4">
        <Link className="text-blue-600 underline" href="/dashboard/facts">Facts</Link>
        <Link className="text-blue-600 underline" href="/dashboard/knowledge">Knowledge</Link>
        <Link className="text-blue-600 underline" href="/">Chat</Link>
      </nav>
    </div>
  );
}