"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  BadgeCheck,
  BookmarkPlus,
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  FileText,
  MapPin,
  NotebookPen,
  Radar,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

function splitDescription(description) {
  return description
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export default function JobsDetailPanel({
  job,
  isLoading,
  isSaving,
  isUpdating,
  isRemoving,
  canLoadDetail,
  statusOptions,
  notesDraft,
  onLoadDetail,
  onNotesChange,
  onSaveNotes,
  onStatusChange,
  onSaveJob,
  onRemoveSavedJob,
}) {
  const descriptionBlocks = useMemo(
    () => splitDescription(job?.description || ""),
    [job?.description]
  );

  if (!job && isLoading) {
    return (
      <Card className="overflow-hidden border shadow-xl lg:sticky lg:top-20">
        <CardHeader className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-11" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card className="border-dashed shadow-lg lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="text-xl gradient-title">Role Details</CardTitle>
          <CardDescription>
            Pick a role from the left panel to open its details, ATS snapshot, and application actions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-border/70 shadow-xl lg:sticky lg:top-20">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit">
              {job.status === "saved" && !job.isSaved ? "Live search result" : "Application tracker"}
            </Badge>
            {job.providerName ? (
              <Badge variant="secondary" className="w-fit">
                {job.providerName}
              </Badge>
            ) : null}
            <div>
              <CardTitle className="text-2xl gradient-title md:text-3xl">
                {job.title}
              </CardTitle>
              <CardDescription className="mt-3 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {job.company}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location || "Location not listed"}
                </span>
                {job.jobType ? (
                  <span className="inline-flex items-center gap-1">
                    <BriefcaseBusiness className="h-4 w-4" />
                    {job.jobType}
                  </span>
                ) : null}
              </CardDescription>
            </div>
          </div>

          <div className="min-w-[132px] rounded-2xl border bg-background p-3 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Match Score
            </p>
            <p className="mt-1.5 text-2xl font-semibold">{job.matchScore || 0}</p>
            <p className="text-sm text-muted-foreground">{job.matchLevel}</p>
            <Progress value={job.matchScore || 0} className="mt-2.5 h-2.5" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.salary ? <Badge variant="secondary">{job.salary}</Badge> : null}
          {job.postedAt ? <Badge variant="outline">{job.postedAt}</Badge> : null}
          {job.locality ? (
            <Badge variant="outline">{job.locality.toUpperCase()}</Badge>
          ) : null}
          {job.isSaved ? (
            <Badge className="gap-1">
              <BadgeCheck className="h-3.5 w-3.5" />
              Tracked
            </Badge>
          ) : null}
          {job.keySkills?.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="max-h-[calc(100vh-10rem)] space-y-5 overflow-y-auto p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {job.url ? (
            <Button asChild className="h-10">
              <a href={job.url} target="_blank" rel="noreferrer noopener">
                Open On {job.providerName || "Source"}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}

          {job.applyUrl ? (
            <Button asChild variant="outline" className="h-10">
              <a href={job.applyUrl} target="_blank" rel="noreferrer noopener">
                Apply Now
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}

          <Button onClick={onSaveJob} disabled={isSaving} variant="secondary" className="h-10">
            <BookmarkPlus className="h-4 w-4" />
            {job.isSaved ? "Saved to Tracker" : "Save Job"}
          </Button>

          <Button asChild variant="outline" className="h-10">
            <Link href={job.coverLetterHref}>
              <FileText className="h-4 w-4" />
              Generate Cover Letter
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-10">
            <Link href={job.interviewHref}>
              <Sparkles className="h-4 w-4" />
              Prepare Interview
            </Link>
          </Button>
        </div>

        {canLoadDetail ? (
          <div className="rounded-2xl border border-dashed bg-muted/25 p-4">
            <p className="font-medium">Need the full role brief?</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Load the detailed listing to pull richer description text, apply link, and stronger ATS keyword signals.
            </p>
            <Button
              onClick={onLoadDetail}
              disabled={isLoading}
              variant="outline"
              className="mt-3 h-10"
            >
              {isLoading ? "Loading Details..." : "Load Full Role Details"}
            </Button>
          </div>
        ) : null}

        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Application Tracker</CardTitle>
            <CardDescription>
              Keep this role inside your pipeline and update its stage as you move forward.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                <p className="text-sm font-medium">Status</p>
                <Select value={job.status} onValueChange={onStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Application Notes</p>
                <Textarea
                  value={notesDraft}
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="Add interview notes, recruiter updates, or next steps..."
                  className="min-h-24"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Use <span className="font-medium text-foreground">Archived</span>{" "}
                to keep a record, or remove the role fully when you no longer need it.
              </p>

              <div className="flex flex-wrap justify-end gap-2">
                {job.isSaved ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onRemoveSavedJob}
                    disabled={isRemoving}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isRemoving ? "Removing..." : "Remove From Tracker"}
                  </Button>
                ) : null}

                <Button onClick={onSaveNotes} disabled={isUpdating}>
                  <NotebookPen className="h-4 w-4" />
                  Save Tracker Notes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ATS Match</CardTitle>
            <CardDescription>
              Quick read on how closely your current resume reflects this role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.resumeAvailable && canLoadDetail ? (
              <div className="rounded-2xl border border-dashed bg-muted/25 p-4">
                <p className="font-medium">Load role details for sharper ATS feedback</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your resume is available. Pull the full listing first so this section can compare better keywords and responsibilities.
                </p>
              </div>
            ) : job.resumeAvailable ? (
              <>
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Resume Fit
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {job.atsScore ?? 0}
                      </p>
                    </div>
                    <div className="flex-1">
                      <Progress value={job.atsScore || 0} className="h-3" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        {job.atsSummary ||
                          "Add more role-specific language to improve ATS alignment."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="mb-3 text-sm font-medium">Already matched</p>
                    <div className="flex flex-wrap gap-2">
                      {job.atsMatchedKeywords?.length ? (
                        job.atsMatchedKeywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary">
                            {keyword}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No strong keyword overlaps detected yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <p className="mb-3 text-sm font-medium">Worth adding</p>
                    <div className="flex flex-wrap gap-2">
                      {job.atsMissingKeywords?.length ? (
                        job.atsMissingKeywords.map((keyword) => (
                          <Badge key={keyword} variant="outline">
                            {keyword}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Your resume already covers the main keywords.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed bg-muted/30 p-5">
                <p className="font-medium">Resume needed for ATS analysis</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Build or save your resume first, then this panel will score the match automatically.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/resume">
                    <Radar className="h-4 w-4" />
                    Open Resume Builder
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Why This Role Shows Up</CardTitle>
            <CardDescription>
              Ranked using your search filters, profile signals, and freshness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.matchReasons?.map((reason) => (
              <div key={reason} className="rounded-2xl border bg-muted/30 p-3 text-sm">
                {reason}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Role Snapshot</CardTitle>
            <CardDescription>
              Key skills and the most useful description excerpts from the source listing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {job.keySkills?.length ? (
                job.keySkills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Skills will appear here once the provider returns more detail.
                </p>
              )}
            </div>

            {descriptionBlocks.length ? (
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                {descriptionBlocks.map((block, index) => (
                  <p key={index}>{block}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                The source did not provide a detailed description for this role yet.
              </p>
            )}
          </CardContent>
        </Card>
      </CardContent>

      <CardFooter className="border-t bg-muted/20 p-3 text-xs text-muted-foreground">
        Keep the role here, update its stage, and jump into tailored application prep without leaving this workspace.
      </CardFooter>
    </Card>
  );
}
