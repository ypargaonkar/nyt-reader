"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
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
  const [showNytKey, setShowNytKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNytKey(settings.nytApiKey);
    setOpenaiKey(settings.openaiApiKey);
  }, [settings.nytApiKey, settings.openaiApiKey]);

  const handleSave = () => {
    updateSettings({
      nytApiKey: nytKey,
      openaiApiKey: openaiKey,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
                <p className="text-sm">Dark mode</p>
                <p className="text-xs text-gray-500">
                  Use dark theme for the interface
                </p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => {
                  updateSettings({ darkMode: checked });
                  if (checked) {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            {saved ? (
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
