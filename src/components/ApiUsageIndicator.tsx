"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UsageData {
  todayCalls: number;
  dailyLimit: number;
  dailyRemaining: number;
  dailyPercentUsed: number;
  callsLastMinute: number;
  minuteLimit: number;
  canMakeCall: boolean;
}

export function ApiUsageIndicator() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/usage");
        if (res.ok) {
          setUsage(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch usage:", error);
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!usage) return null;

  const getStatusColor = () => {
    if (usage.dailyPercentUsed >= 90) return "text-red-500";
    if (usage.dailyPercentUsed >= 70) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <Activity className={cn("h-4 w-4", getStatusColor())} />
            <span className="text-xs font-medium">
              {usage.dailyRemaining}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64 p-3">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Daily API Calls</span>
                <span className="font-medium">
                  {usage.todayCalls} / {usage.dailyLimit}
                </span>
              </div>
              <Progress value={usage.dailyPercentUsed} className="h-2" />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>Rate limit: {usage.minuteLimit} calls/minute</p>
              <p>Calls in last minute: {usage.callsLastMinute}</p>
              <p className="mt-1">
                {usage.canMakeCall ? (
                  <span className="text-green-600">Ready for requests</span>
                ) : (
                  <span className="text-yellow-600">Please wait...</span>
                )}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
