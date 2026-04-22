import { Badge } from "@/components/ui/badge";

const AuthLayout = ({ children }) => {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center px-4 pb-10 pt-28">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="brand-page-header hidden px-8 py-9 lg:block">
          <div className="relative z-10 max-w-xl space-y-5">
            <Badge
              variant="outline"
              className="w-fit border-sky-400/25 bg-background/25 px-3 py-1 text-white/70"
            >
              JOB GENEI Access
            </Badge>
            <div>
              <h1 className="text-4xl font-semibold leading-tight gradient-title">
                Move from browsing opportunities to acting on them faster.
              </h1>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Sign in to search roles, open focused career chats, build your
                resume, and keep your application workflow in one clean place.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Fast UI surfaces", "Shared design system", "Role-aware AI help", "No heavy visual bloat"].map((item) => (
                <div
                  key={item}
                  className="jobs-glow-inner rounded-[22px] border border-border/70 px-4 py-3 text-sm text-white/80"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
