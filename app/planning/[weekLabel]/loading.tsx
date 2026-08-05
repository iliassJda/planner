import { Skeleton } from "@/components/ui/skeleton";

export default function PlanningLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </header>

      {/* Schedule */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="grid grid-cols-7 divide-x">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="flex flex-col min-h-[72px]">
                  <div className="py-1 bg-muted/10 border-b flex flex-col items-center gap-1">
                    <Skeleton className="h-2 w-6" />
                    <Skeleton className="h-2 w-4" />
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1 py-1.5">
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
