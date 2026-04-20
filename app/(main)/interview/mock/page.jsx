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
    <div className="container mx-auto space-y-4 py-6">
      <div className="flex flex-col space-y-2 mx-2">
        <Button asChild variant="link" className="gap-2 pl-0">
          <Link href="/interview">
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Preparation
          </Link>
        </Button>

        <div>
          <h1 className="text-6xl font-bold gradient-title">Mock Interview</h1>
          <p className="text-muted-foreground">
            {hasJobContext
              ? `Practice for ${jobContext.jobTitle || "this role"}${jobContext.companyName ? ` at ${jobContext.companyName}` : ""}`
              : "Test your knowledge with industry-specific questions"}
          </p>
        </div>
      </div>

      <Quiz jobContext={jobContext} />
    </div>
  );
}
