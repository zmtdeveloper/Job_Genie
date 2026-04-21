"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Bookmark,
  Clock3,
  Eye,
  ExternalLink,
  MapPin,
} from "lucide-react";
import {
  deleteSavedJob,
  getJobDetail,
  saveJob,
  updateSavedJob,
} from "@/actions/jobs";
import {
  DEFAULT_JOB_STATUS,
  JOB_TABS,
} from "@/lib/jobs/constants";
import {
  cleanString,
  isRemoteRole,
  parseRelativeAge,
  splitExternalJobId,
} from "@/lib/jobs/utils";
import useFetch from "@/hooks/use-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobsDetailPanel from "./jobs-detail-panel";
import JobsFilterBar from "./jobs-filter-bar";
import JobsSearchDialog from "./jobs-search-dialog";

function getJobKey(job) {
  return cleanString(job?.externalJobId || job?.id);
}

function jobHasDetailedSnapshot(job) {
  return (
    cleanString(job?.description).length > 80 ||
    Boolean(cleanString(job?.applyUrl)) ||
    Boolean(Array.isArray(job?.keySkills) && job.keySkills.length > 0)
  );
}

function buildDetailCache(savedJobs) {
  return Object.fromEntries(
    savedJobs
      .filter((job) => getJobKey(job))
      .map((job) => [
        getJobKey(job),
        {
          ...job,
          detailLoaded: Boolean(
            cleanString(job.description) || cleanString(job.applyUrl)
          ),
        },
      ])
  );
}

function sortSavedJobs(savedJobs) {
  return [...savedJobs].sort((left, right) => {
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function upsertSavedJob(savedJobs, nextJob) {
  const nextKey = getJobKey(nextJob);
  const remainingJobs = savedJobs.filter((job) => getJobKey(job) !== nextKey);
  return sortSavedJobs([{ ...nextJob, isSaved: true }, ...remainingJobs]);
}

function mergeSavedJobIntoLiveJobs(liveJobs, savedJob) {
  const savedKey = getJobKey(savedJob);

  return liveJobs.map((job) =>
    getJobKey(job) === savedKey
      ? {
          ...job,
          ...savedJob,
          isSaved: true,
          matchScore: job.matchScore ?? savedJob.matchScore,
          matchLevel: job.matchLevel ?? savedJob.matchLevel,
          matchReasons:
            job.matchReasons?.length > 0 ? job.matchReasons : savedJob.matchReasons,
        }
      : job
  );
}

function removeSavedStateFromLiveJobs(liveJobs, externalJobId) {
  return liveJobs.map((job) => {
    if (getJobKey(job) !== externalJobId) {
      return job;
    }

    return {
      ...job,
      id: splitExternalJobId(job.externalJobId).rawId || job.id,
      isSaved: false,
      status: DEFAULT_JOB_STATUS,
      notes: "",
      createdAt: "",
      updatedAt: "",
    };
  });
}

function getInitialTab(results, savedJobs) {
  if (!results.hasSearched && savedJobs.length > 0) {
    return JOB_TABS.SAVED;
  }

  return JOB_TABS.TOP;
}

function getInitialSelectionKey(results, savedJobs) {
  const initialTab = getInitialTab(results, savedJobs);
  const initialJobs = getVisibleJobs(initialTab, results.jobs, savedJobs);
  return initialJobs.length > 0 ? getJobKey(initialJobs[0]) : "";
}

function getVisibleJobs(tab, liveJobs, savedJobs) {
  if (tab === JOB_TABS.RECENT) {
    return [...liveJobs].sort((left, right) => {
      const leftAge = parseRelativeAge(left.postedAt);
      const rightAge = parseRelativeAge(right.postedAt);

      if (leftAge == null && rightAge == null) {
        return 0;
      }

      if (leftAge == null) {
        return 1;
      }

      if (rightAge == null) {
        return -1;
      }

      return leftAge - rightAge;
    });
  }

  if (tab === JOB_TABS.REMOTE) {
    return liveJobs.filter((job) => isRemoteRole(job));
  }

  if (tab === JOB_TABS.SAVED) {
    return savedJobs;
  }

  return liveJobs;
}

function buildJobLookup(liveJobs, savedJobs) {
  const lookup = new Map();

  liveJobs.forEach((job) => {
    const jobKey = getJobKey(job);

    if (jobKey) {
      lookup.set(jobKey, job);
    }
  });

  savedJobs.forEach((job) => {
    const jobKey = getJobKey(job);

    if (jobKey) {
      lookup.set(jobKey, job);
    }
  });

  return lookup;
}

function buildCoverLetterHref(job) {
  const params = new URLSearchParams({
    companyName: cleanString(job.company),
    jobTitle: cleanString(job.title),
    jobDescription: [
      cleanString(job.description),
      "Opportunity sourced from your jobs search workspace.",
      `Role: ${job.title}.`,
      `Company: ${job.company}.`,
      job.location ? `Location: ${job.location}.` : "",
      job.salary ? `Salary: ${job.salary}.` : "",
      job.postedAt ? `Posted: ${job.postedAt}.` : "",
      job.url ? `Job link: ${job.url}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  return `/ai-cover-letter/new?${params.toString()}`;
}

function buildInterviewHref(job) {
  const params = new URLSearchParams({
    jobTitle: cleanString(job.title),
    companyName: cleanString(job.company),
    jobDescription: cleanString(job.description).slice(0, 3000),
    keySkills: Array.isArray(job.keySkills) ? job.keySkills.join(", ") : "",
  });

  return `/interview/mock?${params.toString()}`;
}

function enrichDisplayJob(job) {
  if (!job) {
    return null;
  }

  return {
    ...job,
    coverLetterHref: job.coverLetterHref || buildCoverLetterHref(job),
    interviewHref: job.interviewHref || buildInterviewHref(job),
  };
}

function ResultCard({ job, onView }) {
  return (
    <Card className="jobs-glow-inner h-full rounded-[26px] border border-border/70 bg-card/80 shadow-none transition-all duration-200 hover:border-white/15">
      <CardContent className="flex h-full flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
              >
                {job.company}
              </Badge>
              {job.providerName ? (
                <Badge variant="outline">
                  {job.providerName}
                </Badge>
              ) : null}
              {job.isSaved ? (
                <Badge className="gap-1">
                  <Bookmark className="h-3.5 w-3.5" />
                  {job.status === "saved" ? "Tracked" : job.status}
                </Badge>
              ) : null}
            </div>

            <h3
              className="text-lg font-semibold leading-tight"
            >
              {job.title}
            </h3>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location || "Location not listed"}
              </span>
              {job.postedAt ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  {job.postedAt}
                </span>
              ) : null}
            </div>
          </div>

          <div className="jobs-glow-inner min-w-[104px] rounded-[22px] border border-border/70 bg-background/80 p-3 text-right">
            <p
              className="text-xs uppercase tracking-[0.24em] text-muted-foreground"
            >
              Match
            </p>
            <p className="mt-1 text-2xl font-semibold">{job.matchScore || 0}</p>
            <p className="text-xs text-muted-foreground">{job.matchLevel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.salary ? (
            <Badge variant="outline">
              {job.salary}
            </Badge>
          ) : null}
          {job.jobType ? (
            <Badge variant="outline">
              {job.jobType}
            </Badge>
          ) : null}
          {isRemoteRole(job) ? (
            <Badge variant="outline">Remote</Badge>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Progress value={job.matchScore || 0} className="h-1.5" />
          </div>
          <Button
            type="button"
            onClick={onView}
            className="jobs-glow-button jobs-glow-button-primary h-10 shrink-0 rounded-[18px] px-4 text-sm font-semibold"
          >
            <Eye className="h-4 w-4" />
            View Job
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyTabState({ title, description, actionLabel, onAction }) {
  return (
    <Card className="jobs-glow-inner rounded-[26px] border border-dashed border-border/70 bg-card/80 shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onAction} className="jobs-glow-button">
          <ArrowRight className="h-4 w-4" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function JobsHub({
  defaults,
  results,
  savedJobs,
  statusOptions,
  availableProviders,
  error,
}) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(
    !results.hasSearched && savedJobs.length === 0
  );
  const [filters, setFilters] = useState({
    provider: results.criteria.provider ?? defaults.provider,
    company: "",
    query: results.criteria.query ?? defaults.query,
    locality: results.criteria.locality ?? defaults.locality,
  });
  const [liveJobs, setLiveJobs] = useState(results.jobs);
  const [savedJobsState, setSavedJobsState] = useState(savedJobs);
  const [activeTab, setActiveTab] = useState(getInitialTab(results, savedJobs));
  const [activeJobKey, setActiveJobKey] = useState(
    getInitialSelectionKey(results, savedJobs)
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailCache, setDetailCache] = useState(buildDetailCache(savedJobs));
  const [notesDrafts, setNotesDrafts] = useState({});
  const [loadingDetailKey, setLoadingDetailKey] = useState("");
  const [isSearching, startSearchTransition] = useTransition();

  const { loading: savingJob, fn: saveJobFn } = useFetch(saveJob);
  const { loading: updatingJob, fn: updateSavedJobFn } = useFetch(updateSavedJob);
  const { loading: removingJob, fn: deleteSavedJobFn } = useFetch(deleteSavedJob);

  const visibleJobs = useMemo(
    () => getVisibleJobs(activeTab, liveJobs, savedJobsState),
    [activeTab, liveJobs, savedJobsState]
  );
  const jobsByKey = useMemo(
    () => buildJobLookup(liveJobs, savedJobsState),
    [liveJobs, savedJobsState]
  );
  const activeJob = useMemo(
    () => jobsByKey.get(activeJobKey) || null,
    [activeJobKey, jobsByKey]
  );
  const activeJobCache = activeJobKey ? detailCache[activeJobKey] : null;

  const activeJobDetail = useMemo(() => {
    if (!activeJob && !activeJobCache) {
      return null;
    }

    return enrichDisplayJob({
      ...(activeJob || {}),
      ...(activeJobCache || {}),
      resumeAvailable:
        activeJobCache?.resumeAvailable ??
        activeJob?.resumeAvailable ??
        results.profileSummary.hasResume,
      detailLoaded:
        activeJobCache?.detailLoaded ??
        activeJob?.detailLoaded ??
        jobHasDetailedSnapshot(activeJob || activeJobCache),
    });
  }, [activeJob, activeJobCache, results.profileSummary.hasResume]);
  const notesDraft = notesDrafts[activeJobKey] ?? activeJobDetail?.notes ?? "";

  const isDetailLoading =
    Boolean(activeJobKey) && loadingDetailKey === activeJobKey;

  const handleFilterChange = (field, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    Object.entries({
      query: filters.query,
      provider: filters.provider,
      locality: filters.locality,
    }).forEach(([key, value]) => {
      const normalizedValue = value?.trim?.() ?? value;

      if (normalizedValue) {
        params.set(key, normalizedValue);
      }
    });

    params.set("start", "1");

    startSearchTransition(() => {
      router.push(filters.query.trim() ? `/jobs?${params.toString()}` : "/jobs");
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    handleSearch();
  };

  const handleOpenJob = (jobKey) => {
    setActiveJobKey(jobKey);
    setIsDetailOpen(true);
  };

  const handleReset = () => {
    setFilters({
      provider: defaults.provider,
      company: "",
      query: "",
      locality: defaults.locality,
    });

    startSearchTransition(() => {
      router.push("/jobs");
    });
  };

  const handleLoadDetail = async () => {
    if (!activeJobDetail) {
      return;
    }

    const detailKey = getJobKey(activeJobDetail);
    const cachedDetail = detailCache[detailKey];

    if (cachedDetail?.detailLoaded || jobHasDetailedSnapshot(cachedDetail)) {
      return;
    }

    setLoadingDetailKey(detailKey);
    const detail = await getJobDetail({
      jobId: detailKey,
      locality: activeJobDetail.locality || results.criteria.locality,
      fallbackJob: activeJobDetail,
    }).catch((loadError) => {
      toast.error(loadError.message || "Unable to load full role details");
      return null;
    });

    if (detail) {
      setDetailCache((currentCache) => ({
        ...currentCache,
        [detailKey]: {
          ...currentCache[detailKey],
          ...detail,
          detailLoaded: true,
        },
      }));
    }

    setLoadingDetailKey("");
  };

  const applySavedJobLocally = (savedJob) => {
    setSavedJobsState((currentJobs) => upsertSavedJob(currentJobs, savedJob));
    setLiveJobs((currentJobs) => mergeSavedJobIntoLiveJobs(currentJobs, savedJob));
    setDetailCache((currentCache) => ({
      ...currentCache,
      [getJobKey(savedJob)]: {
        ...currentCache[getJobKey(savedJob)],
        ...savedJob,
        detailLoaded:
          currentCache[getJobKey(savedJob)]?.detailLoaded ||
          Boolean(cleanString(savedJob.description) || cleanString(savedJob.applyUrl)),
      },
    }));
  };

  const handleSaveJob = async () => {
    if (!activeJobDetail) {
      return;
    }

    let savedJob = null;

    try {
      savedJob = await saveJobFn(activeJobDetail);
    } catch (error) {
      console.error("Save job error:", error);
      return;
    }

    if (!savedJob) {
      return;
    }

    applySavedJobLocally(savedJob);
    toast.success("Job saved to your tracker");
  };

  const handleStatusChange = async (nextStatus) => {
    if (!activeJobDetail) {
      return;
    }

    let savedJob = null;

    try {
      if (activeJobDetail.isSaved) {
        savedJob = await updateSavedJobFn({
          externalJobId: activeJobDetail.externalJobId,
          status: nextStatus,
        });
      } else {
        savedJob = await saveJobFn({
          ...activeJobDetail,
          status: nextStatus,
        });
      }
    } catch (error) {
      console.error("Update job status error:", error);
      return;
    }

    if (!savedJob) {
      return;
    }

    applySavedJobLocally(savedJob);
    toast.success("Application status updated");
  };

  const handleSaveNotes = async () => {
    if (!activeJobDetail) {
      return;
    }

    let savedJob = null;

    try {
      if (activeJobDetail.isSaved) {
        savedJob = await updateSavedJobFn({
          externalJobId: activeJobDetail.externalJobId,
          notes: notesDraft,
        });
      } else {
        savedJob = await saveJobFn({
          ...activeJobDetail,
          notes: notesDraft,
        });
      }
    } catch (error) {
      console.error("Save job notes error:", error);
      return;
    }

    if (!savedJob) {
      return;
    }

    applySavedJobLocally(savedJob);
    setNotesDrafts((currentDrafts) => ({
      ...currentDrafts,
      [getJobKey(savedJob)]: savedJob.notes || "",
    }));
    toast.success("Tracker notes saved");
  };

  const handleRemoveSavedJob = async () => {
    if (!activeJobDetail?.isSaved) {
      return;
    }

    const shouldDelete = window.confirm(
      `Remove "${activeJobDetail.title}" from your tracker?`
    );

    if (!shouldDelete) {
      return;
    }

    let deletedJob = null;

    try {
      deletedJob = await deleteSavedJobFn({
        externalJobId: activeJobDetail.externalJobId,
        provider: activeJobDetail.provider,
      });
    } catch (error) {
      console.error("Delete saved job error:", error);
      return;
    }

    if (!deletedJob) {
      return;
    }

    const deletedKey = cleanString(deletedJob.externalJobId);

    setSavedJobsState((currentJobs) =>
      currentJobs.filter((job) => getJobKey(job) !== deletedKey)
    );
    setLiveJobs((currentJobs) =>
      removeSavedStateFromLiveJobs(currentJobs, deletedKey)
    );
    setDetailCache((currentCache) => {
      const nextCache = { ...currentCache };
      delete nextCache[deletedKey];
      return nextCache;
    });
    setNotesDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[deletedKey];
      return nextDrafts;
    });

    toast.success("Job removed from your tracker");
  };

  const tabs = [
    {
      value: JOB_TABS.TOP,
      label: "Top Match",
      count: liveJobs.length,
    },
    {
      value: JOB_TABS.REMOTE,
      label: "Remote",
      count: liveJobs.filter((job) => isRemoteRole(job)).length,
    },
    {
      value: JOB_TABS.SAVED,
      label: "Saved",
      count: savedJobsState.length,
    },
  ];

  return (
    <div className="space-y-6 px-4 md:px-1">
      <JobsSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        defaults={filters}
        profileSummary={results.profileSummary}
        providerOptions={availableProviders}
      />

      <JobsFilterBar
        values={filters}
        onChange={handleFilterChange}
        onSubmit={handleSearchSubmit}
        onReset={handleReset}
        onOpenSearch={() => setIsSearchOpen(true)}
        isSearching={isSearching}
        savedCount={savedJobsState.length}
        providerOptions={availableProviders}
      />

      {error ? (
      <Card className="jobs-glow-panel border-destructive/40 shadow-none">
          <CardHeader>
            <CardTitle>Search is available, but this request failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="jobs-glow-panel overflow-hidden rounded-[32px] border border-border/70 bg-background/95 shadow-none">
        <CardHeader className="space-y-4 border-b border-border/70 bg-muted/20 p-4 md:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
            <div className="jobs-glow-inner flex-1 rounded-[26px] border border-border/70 bg-card/80 p-4 md:p-5">
              <CardTitle className="text-2xl gradient-title md:text-3xl">
                {activeTab === JOB_TABS.SAVED
                  ? "Application Tracker"
                  : results.criteria.query
                    ? `${results.criteria.query} results`
                    : "Browse your jobs workspace"}
              </CardTitle>
              <CardDescription className="mt-2">
                {activeTab === JOB_TABS.SAVED
                  ? "Saved jobs, pipeline stages, and follow-up notes live here. Open any card to manage the full workflow."
                  : `Showing ${visibleJobs.length} roles across top match and remote views from ${results.providerName}. Use View Job to open the full workspace.`}
              </CardDescription>
            </div>

            {results.sourceUrl && activeTab !== JOB_TABS.SAVED ? (
              <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-card/80 p-2.5 xl:min-w-[240px]">
                <Button variant="outline" asChild className="jobs-glow-button h-full w-full rounded-[18px]">
                  <a
                    href={results.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open {results.providerName} Search
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : null}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="jobs-glow-inner grid h-auto w-full grid-cols-2 gap-2 rounded-[26px] border border-border/70 bg-card/70 p-2 md:grid-cols-3">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative h-auto rounded-[18px] border border-border/60 bg-background/50 px-4 py-2.5 text-muted-foreground shadow-none transition-all duration-200 before:absolute before:inset-x-6 before:top-0 before:h-px before:rounded-full before:bg-transparent before:content-[''] data-[state=active]:-translate-y-0.5 data-[state=active]:border-white/35 data-[state=active]:bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(148,163,184,0.08)_40%,rgba(15,23,42,0.92))] data-[state=active]:text-white data-[state=active]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),inset_0_1px_0_rgba(255,255,255,0.24),0_14px_26px_-20px_rgba(15,23,42,0.8)] data-[state=active]:before:bg-white/65"
                >
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-4 p-4 md:p-5">
          {!results.hasSearched && activeTab !== JOB_TABS.SAVED ? (
            <EmptyTabState
              title="Start with the role you want"
              description="Use the sticky bar or the focus search dialog to launch a new role search. Your tracker stays available even before you search."
              actionLabel="Open Search"
              onAction={() => setIsSearchOpen(true)}
            />
          ) : null}

          {activeTab === JOB_TABS.SAVED && visibleJobs.length === 0 ? (
            <EmptyTabState
              title="No saved jobs yet"
              description="Save roles from your search results to build an application pipeline and keep notes in one place."
              actionLabel="Search Roles"
              onAction={() => setIsSearchOpen(true)}
            />
          ) : null}

          {results.hasSearched &&
          activeTab !== JOB_TABS.SAVED &&
          visibleJobs.length === 0 ? (
            <EmptyTabState
              title="Nothing matched this tab yet"
              description="Try broadening the role or switching provider and market."
              actionLabel="Adjust Search"
              onAction={() => setIsSearchOpen(true)}
            />
          ) : null}

          {visibleJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleJobs.map((job) => (
                <ResultCard
                  key={`${activeTab}-${getJobKey(job)}`}
                  job={job}
                  onView={() => handleOpenJob(getJobKey(job))}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(activeJobDetail) && isDetailOpen}
        onOpenChange={setIsDetailOpen}
      >
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:rounded-[28px] [&>button]:right-5 [&>button]:top-5 [&>button]:z-20 [&>button]:rounded-full [&>button]:border [&>button]:border-border/70 [&>button]:bg-background/95 [&>button]:p-1 [&>button]:shadow-sm">
          <DialogTitle className="sr-only">
            {activeJobDetail?.title || "Job details"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review role details, ATS fit, tracker notes, and application actions.
          </DialogDescription>

          <JobsDetailPanel
            job={activeJobDetail}
            isLoading={isDetailLoading}
            isSaving={savingJob}
            isUpdating={updatingJob}
            isRemoving={removingJob}
            statusOptions={statusOptions}
            notesDraft={notesDraft}
            canLoadDetail={
              Boolean(activeJobDetail) && !jobHasDetailedSnapshot(activeJobDetail)
            }
            onLoadDetail={handleLoadDetail}
            onNotesChange={(nextValue) =>
              setNotesDrafts((currentDrafts) => ({
                ...currentDrafts,
                [activeJobKey]: nextValue,
              }))
            }
            onSaveNotes={handleSaveNotes}
            onStatusChange={handleStatusChange}
            onSaveJob={handleSaveJob}
            onRemoveSavedJob={handleRemoveSavedJob}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
