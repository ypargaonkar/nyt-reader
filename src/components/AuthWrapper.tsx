"use client";

import { PasswordGate } from "./PasswordGate";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <PasswordGate>{children}</PasswordGate>;
}
