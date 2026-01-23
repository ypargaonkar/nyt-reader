"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { category: "Navigation", items: [
    { keys: ["j"], description: "Move to next article" },
    { keys: ["k"], description: "Move to previous article" },
    { keys: ["g"], description: "Go to first article" },
    { keys: ["Esc"], description: "Clear selection / exit bulk mode" },
  ]},
  { category: "Article Actions", items: [
    { keys: ["o", "Enter"], description: "Open selected article" },
    { keys: ["p"], description: "Preview article (modal)" },
    { keys: ["l"], description: "Like/unlike article" },
    { keys: ["s"], description: "Save/unsave article" },
    { keys: ["m"], description: "Mark as read" },
  ]},
  { category: "Bulk Selection", items: [
    { keys: ["x"], description: "Toggle select (in bulk mode)" },
  ]},
  { category: "Global", items: [
    { keys: ["r"], description: "Refresh feed" },
    { keys: [","], description: "Open settings" },
    { keys: ["?"], description: "Show this help" },
  ]},
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={key} className="flex items-center">
                          {i > 0 && (
                            <span className="text-gray-400 mx-1 text-xs">or</span>
                          )}
                          <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd> to close
        </p>
      </DialogContent>
    </Dialog>
  );
}
