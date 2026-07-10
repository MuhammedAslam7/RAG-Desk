"use client";
import { useAuth } from "@clerk/nextjs";
import Chat from "@/components/chat";
import SignInPrompt from "@/components/sign-in-prompt";

export default function Page() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) {
    return (
      <div className="max-w-xl mx-auto p-4 flex flex-col items-center gap-4">
        <p>Please sign in to chat.</p>
        <SignInPrompt />
      </div>
    );
  }
  return <Chat />;
}