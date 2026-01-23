"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ArticleSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Image skeleton */}
        <Skeleton className="md:w-72 md:min-w-72 h-48 md:h-44 rounded-none" />

        {/* Content skeleton */}
        <CardContent className="flex-1 p-5">
          <div className="flex flex-col h-full">
            {/* Section badges */}
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>

            {/* Title */}
            <Skeleton className="h-7 w-full mb-2" />
            <Skeleton className="h-7 w-3/4 mb-2" />

            {/* Abstract */}
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-5/6 mb-3" />

            {/* Meta info */}
            <div className="flex items-center gap-4 mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Keywords */}
            <div className="flex gap-1 mb-4">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-auto pt-2 border-t">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16 ml-auto" />
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <ArticleSkeleton key={i} />
      ))}
    </div>
  );
}
