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
      <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-2">
          <Button asChild variant="link" className="gap-2 pl-0">
            <Link href="/ai-cover-letter">
              <ArrowLeft className="h-4 w-4" />
              Back to Cover Letters
            </Link>
          </Button>
        </div>

        <Card className="mt-4">
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
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-2">
        <Button asChild variant="link" className="gap-2 pl-0">
          <Link href="/ai-cover-letter">
            <ArrowLeft className="h-4 w-4" />
            Back to Cover Letters
          </Link>
        </Button>

        <h1 className="text-6xl font-bold gradient-title mb-6">
          {coverLetter.jobTitle} at {coverLetter.companyName}
        </h1>
      </div>

      <CoverLetterPreview content={coverLetter.content} />
    </div>
  );
}
