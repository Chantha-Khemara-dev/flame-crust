import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CardSkeleton({ className }) {
  return (
    <div className={cn("rounded-3xl border border-border/60 bg-card overflow-hidden shadow-xs", className)}>
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 sm:p-5 space-y-3">
        <Skeleton className="h-5 w-3/4 rounded-lg" />
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-2/3 rounded" />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-border/40">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 8, className }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6", className)}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MenuPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Category Pills Skeleton */}
      <div className="flex items-center justify-center gap-3 overflow-x-auto py-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="size-16 sm:size-20 rounded-full" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Badges Skeleton */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24 rounded" />
      </div>

      {/* Food Cards Grid */}
      <CardGridSkeleton count={8} />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 animate-in fade-in-50 duration-300">
      {/* VIP Profile Banner Skeleton */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <Skeleton className="size-24 sm:size-28 rounded-full shrink-0" />
            <div className="space-y-2 text-center sm:text-left">
              <Skeleton className="h-7 w-48 rounded-lg mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-32 rounded mx-auto sm:mx-0" />
              <div className="flex gap-2 pt-1 justify-center sm:justify-start">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full sm:w-auto">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Menu Cards 2-Column Grid */}
      <div className="grid sm:grid-cols-2 gap-4 lg:gap-6">
        <div className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-32 rounded mb-2" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-32 rounded mb-2" />
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-32 rounded mb-2" />
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto px-4 animate-in fade-in-50 duration-300">
      <div className="rounded-3xl border border-border/60 bg-card p-4 sm:p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
            <Skeleton className="size-16 sm:size-20 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton({ className }) {
  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto px-4 animate-in fade-in-50 duration-300", className)}>
      <Skeleton className="h-9 w-24 rounded-full mb-4 sm:mb-6" />
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-start">
        <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 sm:h-12 w-4/5 rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </div>
          <div className="pt-6 space-y-3">
            <Skeleton className="h-4 w-28 rounded-md" />
            <div className="grid grid-cols-2 gap-2.5">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </div>
          <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 border-t border-border/40">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Skeleton className="h-12 w-full sm:w-32 rounded-full" />
              <Skeleton className="h-12 w-full sm:w-36 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4, className }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-3 mb-4">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="bg-muted/50 border-b border-border/60 px-4 py-3 flex gap-4">
          {Array.from({ length: cols }, (_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-4 py-3 border-b border-border/40 last:border-b-0 flex gap-4">
            {Array.from({ length: cols }, (_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
