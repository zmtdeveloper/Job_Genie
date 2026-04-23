import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoverLetterGenerator from "../_components/cover-letter-generator";

export default async function NewCoverLetterPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const initialValues = {
    companyName: resolvedSearchParams?.companyName ?? "",
    jobTitle: resolvedSearchParams?.jobTitle ?? "",
    jobDescription: resolvedSearchParams?.jobDescription ?? "",
  };

  return (
    <div className="space-y-5">
      <div className="brand-page-header px-5 py-6 md:px-7 md:py-7">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="brand-kicker">Cover letter studio</p>
            <h1 className="mt-3 text-4xl font-semibold md:text-5xl gradient-title">
              Create Cover Letter
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Generate a tailored cover letter from the role context you already
              captured elsewhere in the app.
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href="/ai-cover-letter">
              <ArrowLeft className="h-4 w-4" />
              Back to Cover Letters
            </Link>
          </Button>
        </div>
      </div>

      <CoverLetterGenerator initialValues={initialValues} />
    </div>
  );
}
