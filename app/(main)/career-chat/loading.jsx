import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CareerChatLoading() {
  return (
    <div className="space-y-6 px-4 md:px-1 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl">
        <CardHeader className="space-y-4 pb-4">
          <Skeleton className="h-5 w-52 bg-white/15" />
          <Skeleton className="h-12 w-80 bg-white/15" />
          <Skeleton className="h-4 w-full max-w-3xl bg-white/10" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 bg-white/10" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <Card className="min-h-[720px]">
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

        <Card className="min-h-[720px]">
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

        <Card className="min-h-[720px]">
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
