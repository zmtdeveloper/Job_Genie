"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Bookmark,
  Clock3,
  ExternalLink,
  Loader2,
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
  JOB_MARKET_LABELS,
  JOB_TABS,
} from "@/lib/jobs/constants";
import {
  cleanString,
  isRemoteRole,
  parseRelativeAge,
  splitExternalJobId,
} from "@/lib/jobs/utils";
import { cn } from "@/lib/utils";
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

function trackerSummaryFromState(savedJobs, statusOptions) {
  return statusOptions.map((option) => ({
    ...option,
    count: savedJobs.filter((job) => job.status === option.value).length,
  }));
}

function ResultCard({ job, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border text-left transition-all duration-200",
        isSelected
          ? "jobs-glow-active border-sky-400/30 bg-slate-950/5 shadow-none"
          : "jobs-glow-inner border-border/70 bg-card shadow-none hover:border-sky-400/20"
      )}
    >
      <div className="space-y-3.5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={isSelected ? "secondary" : "outline"}
                className={cn(isSelected && "bg-slate-900 text-white")}
              >
                {job.company}
              </Badge>
              {job.providerName ? (
                <Badge variant={isSelected ? "secondary" : "outline"}>
                  {job.providerName}
                </Badge>
              ) : null}
              {job.isSaved ? (
                <Badge
                  className={cn(
                    "gap-1",
                    isSelected && "bg-slate-900 text-white hover:bg-slate-900"
                  )}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {job.status === "saved" ? "Tracked" : job.status}
                </Badge>
              ) : null}
            </div>

            <h3
              className={cn(
                "text-lg font-semibold leading-tight",
                isSelected && "text-foreground"
              )}
            >
              {job.title}
            </h3>

            <div
              className={cn(
                "flex flex-wrap gap-3 text-sm text-muted-foreground",
                isSelected && "text-muted-foreground"
              )}
            >
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

          <div
            className={cn(
              "min-w-[104px] rounded-2xl border border-current/10 bg-black/5 p-3 text-right",
              isSelected ? "jobs-glow-active" : "jobs-glow-inner"
            )}
          >
            <p
              className={cn(
                "text-xs uppercase tracking-[0.24em] text-muted-foreground",
                isSelected && "text-muted-foreground"
              )}
            >
              Match
            </p>
            <p className="mt-1 text-2xl font-semibold">{job.matchScore || 0}</p>
            <p
              className={cn(
                "text-xs text-muted-foreground",
                isSelected && "text-muted-foreground"
              )}
            >
              {job.matchLevel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.salary ? (
            <Badge variant={isSelected ? "secondary" : "outline"}>
              {job.salary}
            </Badge>
          ) : null}
          {job.jobType ? (
            <Badge variant={isSelected ? "secondary" : "outline"}>
              {job.jobType}
            </Badge>
          ) : null}
          {isRemoteRole(job) ? (
            <Badge variant={isSelected ? "secondary" : "outline"}>Remote</Badge>
          ) : null}
        </div>

        <div className="space-y-2">
          <Progress
            value={job.matchScore || 0}
            className={cn(
              "h-2",
              isSelected && "bg-white/15 [&>div]:bg-sky-300"
            )}
          />
          <div
            className={cn(
              "space-y-1 text-sm text-muted-foreground",
              isSelected && "text-muted-foreground"
            )}
          >
            {(job.matchReasons || []).slice(0, 2).map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyTabState({ title, description, actionLabel, onAction }) {
  return (
    <Card className="jobs-glow-panel border-dashed shadow-none">
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
    company: results.criteria.company ?? defaults.company,
    query: results.criteria.query ?? defaults.query,
    locality: results.criteria.locality ?? defaults.locality,
  });
  const [liveJobs, setLiveJobs] = useState(results.jobs);
  const [savedJobsState, setSavedJobsState] = useState(savedJobs);
  const [activeTab, setActiveTab] = useState(getInitialTab(results, savedJobs));
  const [selectedJobKey, setSelectedJobKey] = useState(
    getInitialSelectionKey(results, savedJobs)
  );
  const [detailCache, setDetailCache] = useState(buildDetailCache(savedJobs));
  const [notesDrafts, setNotesDrafts] = useState({});
  const [loadingDetailKey, setLoadingDetailKey] = useState("");
  const [isSearching, startSearchTransition] = useTransition();

  const { loading: savingJob, fn: saveJobFn } = useFetch(saveJob);
  const { loading: updatingJob, fn: updateSavedJobFn } = useFetch(updateSavedJob);
  const { loading: removingJob, fn: deleteSavedJobFn } = useFetch(deleteSavedJob);

  const effectiveTrackerSummary = useMemo(
    () => trackerSummaryFromState(savedJobsState, statusOptions),
    [savedJobsState, statusOptions]
  );

  const visibleJobs = useMemo(
    () => getVisibleJobs(activeTab, liveJobs, savedJobsState),
    [activeTab, liveJobs, savedJobsState]
  );
  const effectiveSelectedJobKey = useMemo(() => {
    if (!visibleJobs.length) {
      return "";
    }

    if (visibleJobs.some((job) => getJobKey(job) === selectedJobKey)) {
      return selectedJobKey;
    }

    return getJobKey(visibleJobs[0]);
  }, [selectedJobKey, visibleJobs]);

  const selectedJob = useMemo(
    () =>
      visibleJobs.find((job) => getJobKey(job) === effectiveSelectedJobKey) ||
      null,
    [effectiveSelectedJobKey, visibleJobs]
  );

  const selectedJobDetail = useMemo(() => {
    const cacheEntry = selectedJob ? detailCache[getJobKey(selectedJob)] : null;
    return enrichDisplayJob({
      ...(selectedJob || {}),
      ...(cacheEntry || {}),
      resumeAvailable:
        cacheEntry?.resumeAvailable ??
        selectedJob?.resumeAvailable ??
        results.profileSummary.hasResume,
      detailLoaded:
        cacheEntry?.detailLoaded ??
        selectedJob?.detailLoaded ??
        jobHasDetailedSnapshot(selectedJob || cacheEntry),
    });
  }, [detailCache, results.profileSummary.hasResume, selectedJob]);
  const notesDraft =
    notesDrafts[effectiveSelectedJobKey] ?? selectedJobDetail?.notes ?? "";

  const selectedKey = getJobKey(selectedJobDetail);
  const isDetailLoading = Boolean(selectedKey) && loadingDetailKey === selectedKey;

  const handleFilterChange = (field, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
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
    if (!selectedJobDetail) {
      return;
    }

    const detailKey = getJobKey(selectedJobDetail);
    const cachedDetail = detailCache[detailKey];

    if (cachedDetail?.detailLoaded || jobHasDetailedSnapshot(cachedDetail)) {
      return;
    }

    setLoadingDetailKey(detailKey);
    const detail = await getJobDetail({
      jobId: detailKey,
      locality: selectedJobDetail.locality || results.criteria.locality,
      fallbackJob: selectedJobDetail,
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
    if (!selectedJobDetail) {
      return;
    }

    const savedJob = await saveJobFn(selectedJobDetail);

    if (!savedJob) {
      return;
    }

    applySavedJobLocally(savedJob);
    toast.success("Job saved to your tracker");
  };

  const handleStatusChange = async (nextStatus) => {
    if (!selectedJobDetail) {
      return;
    }

    let savedJob = null;

    if (selectedJobDetail.isSaved) {
      savedJob = await updateSavedJobFn({
        externalJobId: selectedJobDetail.externalJobId,
        status: nextStatus,
      });
    } else {
      savedJob = await saveJobFn({
        ...selectedJobDetail,
        status: nextStatus,
      });
    }

    if (!savedJob) {
      return;
    }

    applySavedJobLocally(savedJob);
    toast.success("Application status updated");
  };

  const handleSaveNotes = async () => {
    if (!selectedJobDetail) {
      return;
    }

    let savedJob = null;

    if (selectedJobDetail.isSaved) {
      savedJob = await updateSavedJobFn({
        externalJobId: selectedJobDetail.externalJobId,
        notes: notesDraft,
      });
    } else {
      savedJob = await saveJobFn({
        ...selectedJobDetail,
        notes: notesDraft,
      });
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
    if (!selectedJobDetail?.isSaved) {
      return;
    }

    const shouldDelete = window.confirm(
      `Remove "${selectedJobDetail.title}" from your tracker?`
    );

    if (!shouldDelete) {
      return;
    }

    const deletedJob = await deleteSavedJobFn({
      externalJobId: selectedJobDetail.externalJobId,
      provider: selectedJobDetail.provider,
    });

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
      value: JOB_TABS.RECENT,
      label: "Recent",
      count: liveJobs.filter((job) => parseRelativeAge(job.postedAt) != null).length,
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.92fr)]">
        <Card className="jobs-glow-panel border border-border/70 shadow-none">
          <CardHeader className="space-y-4 border-b bg-muted/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle className="text-2xl gradient-title md:text-3xl">
                  {activeTab === JOB_TABS.SAVED
                    ? "Application Tracker"
                    : results.criteria.query
                      ? `${results.criteria.query} results`
                      : "Browse your jobs workspace"}
                </CardTitle>
                <CardDescription className="mt-2">
                  {activeTab === JOB_TABS.SAVED
                    ? "Saved jobs, pipeline stages, and follow-up notes live here."
                    : `Showing ${visibleJobs.length} roles across top match, recent, and remote views from ${results.providerName}.`}
                </CardDescription>
              </div>

              {results.sourceUrl && activeTab !== JOB_TABS.SAVED ? (
                <Button variant="outline" asChild className="jobs-glow-button">
                  <a
                    href={results.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open {results.providerName} Search
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-4">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="jobs-glow-inner h-auto rounded-xl border border-border/70 px-3 py-2.5 shadow-none data-[state=active]:border-sky-400/30 data-[state=active]:bg-slate-950 data-[state=active]:text-white"
                  >
                    <span className="flex items-center gap-2">
                      {tab.label}
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2 py-0.5 text-xs"
                      >
                        {tab.count}
                      </Badge>
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

          </CardHeader>

          <CardContent className="space-y-4 p-4">
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
                description="Try broadening the role, clearing the company filter, or switching provider and market."
                actionLabel="Adjust Search"
                onAction={() => setIsSearchOpen(true)}
              />
            ) : null}

            <div className="space-y-4">
              {visibleJobs.map((job) => (
                <ResultCard
                  key={`${activeTab}-${getJobKey(job)}`}
                  job={job}
                  isSelected={getJobKey(job) === effectiveSelectedJobKey}
                  onSelect={() => setSelectedJobKey(getJobKey(job))}
                />
              ))}
            </div>

            {isDetailLoading && visibleJobs.length > 0 ? (
              <div className="jobs-glow-inner rounded-xl border border-dashed p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading full role details...
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <JobsDetailPanel
          job={selectedJobDetail}
          isLoading={isDetailLoading}
          isSaving={savingJob}
          isUpdating={updatingJob}
          isRemoving={removingJob}
          statusOptions={statusOptions}
          notesDraft={notesDraft}
          canLoadDetail={Boolean(selectedJobDetail) && !jobHasDetailedSnapshot(selectedJobDetail)}
          onLoadDetail={handleLoadDetail}
          onNotesChange={(nextValue) =>
            setNotesDrafts((currentDrafts) => ({
              ...currentDrafts,
              [effectiveSelectedJobKey]: nextValue,
            }))
          }
          onSaveNotes={handleSaveNotes}
          onStatusChange={handleStatusChange}
          onSaveJob={handleSaveJob}
          onRemoveSavedJob={handleRemoveSavedJob}
        />
      </div>
    </div>
  );
}
