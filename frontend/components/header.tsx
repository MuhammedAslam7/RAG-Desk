"use client";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b px-5 py-3"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <Link href="/" className="font-semibold tracking-tight">RAG Desk</Link>
      <div className="flex items-center gap-3">
        <Show
          when="signed-in"
          fallback={
            <>
              <SignInButton mode="modal">
                <button className="btn btn-ghost">Sign in</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-primary">Sign up</button>
              </SignUpButton>
            </>
          }
        >
          <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}