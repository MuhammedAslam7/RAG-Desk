"use client";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b">
      <Link href="/" className="font-semibold">AI Support</Link>
      <div className="flex items-center gap-3">
        <Show
          when="signed-in"
          fallback={
            <>
              <SignInButton mode="modal" />
              <SignUpButton mode="modal" />
            </>
          }
        >
          <Link href="/dashboard" className="text-blue-600">Dashboard</Link>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}