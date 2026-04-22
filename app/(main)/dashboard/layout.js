import { BarLoader } from "react-spinners";
import { Suspense } from "react";

export default function Layout({ children }) {
  return (
    <div className="space-y-6">
      <div className="brand-page-header px-6 py-7 md:px-8">
        <div className="relative z-10">
          <p className="brand-kicker">Market intelligence</p>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl gradient-title">
            Industry Insights
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            Track market outlook, role demand, salary movement, and skill
            momentum in the same workspace where you search, apply, and prepare.
          </p>
        </div>
      </div>
      <Suspense
        fallback={<BarLoader className="mt-2" width={"100%"} color="#38bdf8" />}
      >
        {children}
      </Suspense>
    </div>
  );
}
