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
    <div>
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient-title">My Cover Letters</h1>
        <Link href="/ai-cover-letter/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </Link>
      </div>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Cover letters are temporarily unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ai-cover-letter">
              <Button variant="outline">Try Again</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <CoverLetterList coverLetters={coverLetters} />
      )}
    </div>
  );
}
