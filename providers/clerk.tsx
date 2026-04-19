"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { Toaster } from "@/components/ui/sonner";
import { ScopedThemeProvider } from "@/providers/scoped-theme-provider";

export default function ClerkProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider ui={ui} appearance={clerkAppearance}>
      <ScopedThemeProvider>
        {children}
        <Toaster richColors position="top-center" />
      </ScopedThemeProvider>
    </ClerkProvider>
  );
}
