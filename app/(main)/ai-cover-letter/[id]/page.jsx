import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCoverLetter } from "@/actions/cover-letter";
import CoverLetterPreview from "../_components/cover-letter-preview";

export default async function EditCoverLetterPage({ params }) {
  const { id } = await params;
  let coverLetter = null;
  let loadError = "";

  try {
    coverLetter = await getCoverLetter(id);
  } catch (error) {
    loadError = error?.message || "Unable to open this cover letter right now.";
  }

  if (!coverLetter && !loadError) {
    notFound();
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <div className="brand-page-header px-5 py-6 md:px-7 md:py-7">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="brand-kicker">Cover letter studio</p>
              <h1 className="mt-3 text-4xl font-semibold md:text-5xl gradient-title">
                Cover Letter Preview
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                This draft could not be loaded right now.
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

        <Card className="jobs-glow-panel border-border/70">
          <CardHeader>
            <CardTitle>Unable to open this cover letter</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild variant="outline">
              <Link href={`/ai-cover-letter/${id}`}>Try Again</Link>
            </Button>
            <Button asChild>
              <Link href="/ai-cover-letter">Back To List</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="brand-page-header px-5 py-6 md:px-7 md:py-7">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="brand-kicker">Cover letter preview</p>
            <h1 className="mt-3 text-4xl font-semibold md:text-5xl gradient-title">
              {coverLetter.jobTitle} at {coverLetter.companyName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Review the final letter in a clean reading view before you reuse
              or refine it for the application.
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

      <CoverLetterPreview content={coverLetter.content} />
    </div>
  );
}
