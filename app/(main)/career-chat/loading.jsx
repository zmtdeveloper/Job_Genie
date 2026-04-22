import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CareerChatLoading() {
  return (
    <div className="space-y-6 px-4 md:px-1 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <Card className="jobs-glow-panel overflow-hidden rounded-[24px] border border-border/70 bg-card/90 text-foreground shadow-none">
        <CardHeader className="space-y-4 pb-4">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-4 w-full max-w-3xl" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <Card className="jobs-glow-panel min-h-[720px] rounded-[24px] shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </CardContent>
        </Card>

        <Card className="jobs-glow-panel min-h-[720px] rounded-[24px] shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-16 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
            <Skeleton className="h-36 w-full" />
          </CardContent>
        </Card>

        <Card className="jobs-glow-panel min-h-[720px] rounded-[24px] shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
