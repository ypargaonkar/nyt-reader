"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [mounted, setMounted] = useState(false);
  const { settings, demoMode } = useAppStore();

  // Track mount state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Still loading
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  // Password is now verified in SettingsDialog when saving API keys.
  // If user has API keys, they authenticated when saving them.
  // Just render children - the app handles showing landing page vs main view.
  return <>{children}</>;
}
