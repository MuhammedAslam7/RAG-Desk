"use client";
import { SignInButton } from "@clerk/nextjs";

export default function SignInPrompt() {
  return (
    <SignInButton mode="modal">
      <button className="px-4 py-2 rounded-lg bg-blue-600 text-white">Sign in</button>
    </SignInButton>
  );
}