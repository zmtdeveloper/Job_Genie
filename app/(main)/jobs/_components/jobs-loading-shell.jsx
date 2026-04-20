import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoadingShell() {
  return (
    <div className="space-y-6 px-4 md:px-1">
      <Card className="jobs-glow-panel overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-none">
        <CardHeader className="space-y-4 pb-4">
          <Skeleton className="h-5 w-40 bg-white/15" />
          <Skeleton className="h-12 w-72 bg-white/15" />
          <Skeleton className="h-4 w-full max-w-2xl bg-white/10" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 bg-white/10" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="jobs-glow-panel sticky top-20 z-20 border shadow-none">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto]">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11 w-24" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card className="jobs-glow-panel min-h-[680px] shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="jobs-glow-inner rounded-2xl border border-border/60 p-4 shadow-none"
              >
                <div className="space-y-3">
                  <Skeleton className="h-6 w-52" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="jobs-glow-panel min-h-[680px] shadow-none">
          <CardHeader className="space-y-4">
            <Skeleton className="h-10 w-52" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
            </div>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
