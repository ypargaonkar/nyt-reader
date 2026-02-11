"use client";

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { settings, demoMode } = useAppStore();

  // Track mount state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if already authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem("nyt-reader-auth");
    if (token) {
      // Verify token is still valid
      verifyToken(token);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("nyt-reader-auth");
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("nyt-reader-auth", data.token);
        setIsAuthenticated(true);
      } else {
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Still checking auth status or not mounted yet
  if (isAuthenticated === null || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  // Allow access without password if:
  // 1. No API key set (will show landing page)
  // 2. In demo mode
  const hasApiKey = !!settings.nytApiKey;
  if (!hasApiKey || demoMode) {
    return <>{children}</>;
  }

  // Show login screen only when user has API keys (protecting personalized view)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-2xl flex items-center justify-center mb-4">
                <Newspaper className="w-8 h-8 text-white dark:text-black" />
              </div>
              <h1 className="font-serif text-center">
                <span className="text-gray-900 dark:text-white text-sm font-normal block">The New York Times</span>
                <span className="text-yellow-600 dark:text-yellow-500 text-2xl font-bold">Reader</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Enter password to continue
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-11 pr-11 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full py-3 rounded-xl"
                disabled={isLoading || !password}
              >
                {isLoading ? "Checking..." : "Continue"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show app
  return <>{children}</>;
}
