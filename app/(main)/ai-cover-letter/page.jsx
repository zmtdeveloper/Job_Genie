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
    <div className="space-y-5">
      <div className="brand-page-header px-5 py-6 md:px-7 md:py-7">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="brand-kicker">Application writing</p>
            <h1 className="mt-3 text-4xl font-semibold md:text-5xl gradient-title">
              My Cover Letters
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Generate tailored letters, review past drafts, and jump straight
              into edits when a role changes.
            </p>
          </div>

          <div className="jobs-glow-inner rounded-[22px] border border-border/70 bg-background/55 p-3.5 shadow-none sm:min-w-[250px]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Draft Library
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {coverLetters.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Saved cover letters
                </p>
              </div>
              <Button asChild className="h-10 rounded-[16px] px-4">
                <Link href="/ai-cover-letter/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New
                </Link>
              </Button>
            </div>
          </div>
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
