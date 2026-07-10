"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function SignInPrompt() {
  return (
    <SignInButton mode="modal">
      <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-6 h-auto text-base">
        Sign In
        <ArrowRight className="h-4 w-4" />
      </Button>
    </SignInButton>
  );
}
