import { getCoverLetters } from "@/actions/cover-letter";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CoverLetterList from "./_components/cover-letter-list";

export default async function CoverLetterPage() {
  let coverLetters = [];
  let loadError = "";

  try {
    coverLetters = await getCoverLetters();
  } catch (error) {
    loadError =
      error?.message || "Unable to load your cover letters right now.";
  }

  return (
    <div className="space-y-6">
      <div className="brand-page-header px-6 py-7 md:px-8">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="brand-kicker">Application writing</p>
            <h1 className="mt-3 text-4xl font-semibold md:text-5xl gradient-title">
              My Cover Letters
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Generate tailored letters, review past drafts, and jump straight
              into edits when a role changes.
            </p>
          </div>

          <Button asChild>
            <Link href="/ai-cover-letter/new">
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Link>
          </Button>
        </div>
      </div>

      {loadError ? (
        <Card className="jobs-glow-panel border-border/70">
          <CardHeader>
            <CardTitle>Cover letters are temporarily unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/ai-cover-letter">Try Again</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CoverLetterList coverLetters={coverLetters} />
      )}
    </div>
  );
}
