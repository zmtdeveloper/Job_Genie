import { Suspense } from "react";
import { BarLoader } from "react-spinners";

export default function Layout({ children }) {
  return (
    <div className="space-y-6">
      <Suspense
        fallback={<BarLoader className="mt-2" width={"100%"} color="#38bdf8" />}
      >
        {children}
      </Suspense>
    </div>
  );
}
