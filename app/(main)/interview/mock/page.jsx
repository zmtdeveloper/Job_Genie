import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Quiz from "../_components/quiz";

function readSearchParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MockInterviewPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const jobContext = {
    jobTitle: readSearchParam(resolvedSearchParams?.jobTitle) ?? "",
    companyName: readSearchParam(resolvedSearchParams?.companyName) ?? "",
    jobDescription: readSearchParam(resolvedSearchParams?.jobDescription) ?? "",
    keySkills: readSearchParam(resolvedSearchParams?.keySkills) ?? "",
  };
  const hasJobContext = Boolean(jobContext.jobTitle || jobContext.companyName);

  return (
    <div className="space-y-6">
      <div className="brand-page-header px-6 py-7 md:px-8">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="brand-kicker">Live mock session</p>
            <h1 className="mt-3 text-4xl font-semibold md:text-5xl gradient-title">
              Mock Interview
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {hasJobContext
                ? `Practice for ${jobContext.jobTitle || "this role"}${jobContext.companyName ? ` at ${jobContext.companyName}` : ""}`
                : "Test your knowledge with industry-specific questions"}
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href="/interview">
              <ArrowLeft className="h-4 w-4" />
              Back to Interview Preparation
            </Link>
          </Button>
        </div>
      </div>

      <Quiz jobContext={jobContext} />
    </div>
  );
}
