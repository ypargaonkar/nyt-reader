"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MorphHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MorphHowToPlay({ open, onOpenChange }: MorphHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How to Play Morph</DialogTitle>
          <DialogDescription>
            Transform one word into another, one letter at a time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">Rules:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Change <strong>exactly one letter</strong> at a time</li>
              <li>Each step must be a <strong>valid English word</strong></li>
              <li>Try to reach the target in as <strong>few steps</strong> as possible</li>
              <li><strong>Par</strong> = the shortest possible path</li>
            </ol>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">Example:</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                <span>C O L D</span>
                <span className="text-xs text-gray-400 ml-2">start</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />
                <span>C O R D</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
                <span>W O R D</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
                <span>W O R M</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                <span>W A R M</span>
                <span className="text-xs text-gray-400 ml-2">target</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">Colors:</p>
            <p>
              Words change color as you get closer to the target — from{" "}
              <span className="text-blue-500 font-medium">blue</span> (far) to{" "}
              <span className="text-amber-500 font-medium">gold</span> (reached!).
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">Scoring:</p>
            <p>
              Golf-style! Beat par for a Birdie or Eagle. Match par for Par.
              Go over for a Bogey.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
