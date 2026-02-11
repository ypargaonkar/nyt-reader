"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Check, Lock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useAppStore();
  const [nytKey, setNytKey] = useState(settings.nytApiKey);
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey);
  const [password, setPassword] = useState("");
  const [showNytKey, setShowNytKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if already authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("nyt-reader-auth");
    setIsAuthenticated(!!token);
  }, [open]);

  useEffect(() => {
    setNytKey(settings.nytApiKey);
    setOpenaiKey(settings.openaiApiKey);
  }, [settings.nytApiKey, settings.openaiApiKey]);

  const handleSave = async () => {
    setError("");

    // If saving API keys and not already authenticated, verify password first
    if (nytKey && !isAuthenticated) {
      if (!password) {
        setError("Password required to save API keys");
        return;
      }

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
          setIsLoading(false);
          return;
        }
      } catch {
        setError("Authentication failed");
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    // Save settings
    updateSettings({
      nytApiKey: nytKey,
      openaiApiKey: openaiKey,
    });
    setSaved(true);
    setPassword("");
    setTimeout(() => {
      setSaved(false);
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your API keys and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Password - only show if not authenticated and adding API keys */}
          {!isAuthenticated && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Get password from Yash"
                  className="w-full px-3 py-2 border rounded-md pr-10 dark:bg-gray-900 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Get the password from Yash to access the personalized view
              </p>
              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </p>
              )}
            </div>
          )}

          {isAuthenticated && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Authenticated - your settings are protected
            </div>
          )}

          <Separator />

          {/* NYT API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">NYT API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showNytKey ? "text" : "password"}
                  value={nytKey}
                  onChange={(e) => setNytKey(e.target.value)}
                  placeholder="Enter your NYT API key"
                  className="w-full px-3 py-2 border rounded-md pr-10 dark:bg-gray-900 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShowNytKey(!showNytKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNytKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Get your key at{" "}
              <a
                href="https://developer.nytimes.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                developer.nytimes.com
              </a>
            </p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">OpenAI API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showOpenaiKey ? "text" : "password"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className="w-full px-3 py-2 border rounded-md pr-10 dark:bg-gray-900 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showOpenaiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Required for AI-powered preference analysis. Get your key at{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                platform.openai.com
              </a>
            </p>
          </div>

          <Separator />

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Preferences</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Auto-refresh feed</p>
                <p className="text-xs text-gray-500">
                  Automatically refresh every {settings.refreshInterval} minutes
                </p>
              </div>
              <Switch
                checked={settings.autoRefresh}
                onCheckedChange={(checked) =>
                  updateSettings({ autoRefresh: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Theme</p>
                <p className="text-xs text-gray-500">
                  Choose light, dark, or system theme
                </p>
              </div>
              <select
                value={settings.themeMode || "system"}
                onChange={(e) => {
                  const mode = e.target.value as "light" | "dark" | "system";
                  updateSettings({ themeMode: mode });
                  if (mode === "system") {
                    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                    document.documentElement.classList.toggle("dark", isDark);
                  } else {
                    document.documentElement.classList.toggle("dark", mode === "dark");
                  }
                }}
                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="gap-2">
            {isLoading ? (
              "Verifying..."
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
