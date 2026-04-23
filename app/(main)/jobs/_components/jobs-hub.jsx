"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobsDetailPanel from "./jobs-detail-panel";
import JobsFilterBar from "./jobs-filter-bar";
import JobsSearchDialog from "./jobs-search-dialog";

const postedDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

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

function formatStatusLabel(value) {
  return cleanString(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPostedDate(value) {
  const normalizedValue = cleanString(value);

  if (!normalizedValue) {
    return "";
  }

  const parsedDate = new Date(normalizedValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    return postedDateFormatter.format(parsedDate);
  }

  const ageInDays = parseRelativeAge(normalizedValue);

  if (ageInDays == null) {
    return "";
  }

  const fallbackDate = new Date();
  fallbackDate.setHours(0, 0, 0, 0);
  fallbackDate.setDate(fallbackDate.getDate() - ageInDays);

  return postedDateFormatter.format(fallbackDate);
}

function getCompanyInitials(value) {
  const normalizedValue = cleanString(value);

  if (!normalizedValue) {
    return "JG";
  }

  return normalizedValue
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function getTrackerBadgeClass(value) {
  switch (cleanString(value).toLowerCase()) {
    case "tracked":
    case "saved":
      return "border-sky-400/34 bg-sky-400/14 text-sky-100";
    case "applied":
      return "border-emerald-400/34 bg-emerald-400/14 text-emerald-100";
    case "interviewing":
      return "border-amber-400/34 bg-amber-400/14 text-amber-100";
    case "offer":
      return "border-violet-400/34 bg-violet-400/14 text-violet-100";
    case "archived":
      return "border-slate-400/34 bg-slate-400/14 text-slate-100";
    default:
      return "border-white/12 bg-white/[0.06] text-white/72";
  }
}

function getMatchStatusClass(value) {
  switch (cleanString(value).toLowerCase()) {
    case "top match":
      return "text-emerald-300";
    case "good fit":
      return "text-sky-300";
    case "worth reviewing":
      return "text-amber-300";
    default:
      return "text-white";
  }
}

function getScoreSummary(value) {
  if (value >= 80) {
    return "High match";
  }

  if (value >= 60) {
    return "Good match";
  }

  return "Review role";
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
  const postedDate = formatPostedDate(job.postedAt);
  const matchLabel = cleanString(job.matchLevel) || "Fit";
  const trackerStatus = job.isSaved
    ? job.status === "saved"
      ? "tracked"
      : job.status
    : "live";
  const trackerLabel = job.isSaved
    ? formatStatusLabel(job.status === "saved" ? "Tracked" : job.status)
    : "Live";
  const scoreValue = Math.max(0, Math.min(99, Number(job.matchScore) || 0));
  const progressWidth = `${scoreValue}%`;
  const matchReason = cleanString(
    Array.isArray(job.matchReasons) && job.matchReasons.length > 0
      ? job.matchReasons[0]
      : "Matched using your search criteria and current profile."
  );
  const secondaryMeta = [job.salary, job.jobType, isRemoteRole(job) ? "Remote" : null]
    .filter(Boolean);
  const mobileMeta = [job.jobType, isRemoteRole(job) ? "Remote" : null, job.salary]
    .filter(Boolean)
    .slice(0, 1);
  const companyInitials = getCompanyInitials(job.company);
  const scoreSummary = getScoreSummary(scoreValue);

  return (
    <Card className="jobs-glow-inner rounded-[20px] border border-border/70 bg-card/85 shadow-none transition-all duration-200 hover:border-sky-300/20 sm:rounded-[26px] sm:hover:-translate-y-0.5">
      <CardContent className="p-3 sm:p-4 lg:p-5">
        <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-center xl:gap-5">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start gap-3 sm:hidden">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-xs font-semibold text-sky-100/75">
                  {job.company || "Company not listed"}
                </p>
                <h3 className="line-clamp-2 text-base font-semibold leading-tight text-white">
                  {job.title}
                </h3>
              </div>

              <div className="flex min-h-[64px] min-w-[64px] shrink-0 flex-col items-center justify-center rounded-[16px] border border-sky-300/14 bg-[linear-gradient(180deg,rgba(10,18,31,0.94),rgba(12,23,39,0.88))] px-2.5 py-2 text-center">
                <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Score
                </p>
                <p className="mt-1 text-xl font-semibold leading-none text-white">
                  {scoreValue}
                </p>
              </div>
            </div>

            <div className="hidden items-start gap-4 sm:flex">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-sky-300/18 bg-[linear-gradient(180deg,rgba(125,211,252,0.14),rgba(14,23,38,0.2))] text-base font-semibold tracking-[0.16em] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {companyInitials}
              </div>

              <div className="min-w-0 space-y-3">
                <div className="space-y-1.5">
                  <p className="truncate text-sm font-semibold text-sky-100/75">
                    {job.company || "Company not listed"}
                  </p>
                  <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-white lg:text-[1.45rem]">
                    {job.title}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-border/65 bg-background/45 px-3.5 py-1.5">
                    <MapPin className="h-4 w-4 text-sky-200/70" />
                    <span className="truncate">{job.location || "Location not listed"}</span>
                  </span>

                  {postedDate ? (
                    <span className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-border/65 bg-background/45 px-3.5 py-1.5">
                      <Clock3 className="h-4 w-4 text-sky-200/70" />
                      <span>{postedDate}</span>
                    </span>
                  ) : null}

                  {secondaryMeta.map((item) => (
                    <span
                      key={item}
                      className="inline-flex min-h-[36px] items-center rounded-full border border-border/65 bg-background/45 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground sm:hidden">
              <span className="inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-full border border-border/65 bg-background/45 px-3 py-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-200/70" />
                <span className="truncate">{job.location || "Location not listed"}</span>
              </span>

              {postedDate ? (
                <span className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-border/65 bg-background/45 px-3 py-1">
                  <Clock3 className="h-3.5 w-3.5 text-sky-200/70" />
                  <span>{postedDate}</span>
                </span>
              ) : null}

              {mobileMeta.map((item) => (
                <span
                  key={item}
                  className="inline-flex min-h-[32px] items-center rounded-full border border-border/65 bg-background/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/82"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-2.5 sm:gap-3 xl:min-w-[420px] xl:max-w-[520px] xl:grid-cols-[minmax(0,1fr)_132px]">
            <div className="rounded-[18px] border border-border/65 bg-background/44 p-3 sm:rounded-[22px] sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    Match
                  </p>
                  <p
                    className={`text-lg font-semibold leading-none ${getMatchStatusClass(
                      matchLabel
                    )}`}
                  >
                    {matchLabel}
                  </p>
                </div>

                <span
                  className={`inline-flex min-h-[34px] items-center justify-center rounded-full border px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] ${getTrackerBadgeClass(
                    trackerStatus
                  )}`}
                >
                  {trackerLabel}
                </span>
              </div>

              <p className="mt-3 hidden text-sm leading-6 text-muted-foreground sm:block">
                {matchReason}
              </p>

              <div className="mt-3 space-y-2 sm:mt-4">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="sm:hidden">{scoreSummary}</span>
                  <span className="hidden sm:inline">Match Score</span>
                  <span>{scoreValue}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-700/35">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(125,211,252,0.92),rgba(56,189,248,0.96),rgba(37,99,235,0.92))] shadow-[0_0_16px_rgba(56,189,248,0.24)]"
                    style={{ width: progressWidth }}
                  />
                </div>
              </div>
            </div>

            <div className="hidden flex-col gap-3 sm:flex sm:flex-row xl:flex-col">
              <div className="flex min-h-[110px] flex-1 flex-col items-center justify-center rounded-[22px] border border-sky-300/14 bg-[linear-gradient(180deg,rgba(10,18,31,0.94),rgba(12,23,39,0.88))] px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Score
                </p>
                <p className="mt-2 text-[2rem] font-semibold leading-none text-white">
                  {scoreValue}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-sky-100/70">
                  {scoreSummary}
                </p>
              </div>

              <Button
                type="button"
                onClick={onView}
                className="jobs-glow-button jobs-glow-button-primary h-11 rounded-[18px] px-4 text-sm font-semibold sm:flex-1 xl:flex-none"
              >
                <Eye className="h-4 w-4" />
                View Job
              </Button>
            </div>

            <Button
              type="button"
              onClick={onView}
              className="jobs-glow-button jobs-glow-button-primary h-10 rounded-[16px] px-4 text-sm font-semibold sm:hidden"
            >
              <Eye className="h-4 w-4" />
              View Job
            </Button>
          </div>
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
    <div className="space-y-5 px-3 sm:px-1">
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
        isSearching={isSearching}
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

      <Card className="jobs-glow-panel overflow-hidden rounded-[28px] border border-border/70 bg-background/95 shadow-none">
        <CardHeader className="border-b border-border/70 bg-muted/20 p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-card/80 p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
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
                  <Button
                    variant="outline"
                    asChild
                    className="jobs-glow-button h-10 shrink-0 rounded-full border-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(186,230,253,0.18)_34%,rgba(56,189,248,0.08)_100%),linear-gradient(135deg,rgba(103,232,249,0.8),rgba(56,189,248,0.9)_42%,rgba(37,99,235,0.92))] px-4 text-[13px] font-semibold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_16px_30px_-24px_rgba(37,99,235,0.62)] hover:brightness-105"
                  >
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

              <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-full border-0 bg-transparent p-0 xl:w-auto">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="jobs-glow-button h-10 rounded-full border-0 bg-[#0b1626]/74 px-4 text-[13px] font-semibold text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-sky-300/35 hover:bg-[#10203a] data-[state=active]:bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(186,230,253,0.18)_34%,rgba(56,189,248,0.08)_100%),linear-gradient(135deg,rgba(103,232,249,0.8),rgba(56,189,248,0.9)_42%,rgba(37,99,235,0.92))] data-[state=active]:text-slate-950 data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_16px_30px_-24px_rgba(37,99,235,0.62)]"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  <span>{visibleJobs.length} roles</span>
                  <span className="text-white/20">|</span>
                  <span>{activeTab === JOB_TABS.SAVED ? "Tracker View" : results.providerName}</span>
                </div>
              </div>
            </div>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          {!results.hasSearched && activeTab !== JOB_TABS.SAVED ? (
            <EmptyTabState
              title="Start with the role you want"
              description="Use the search bar or the quick search dialog to launch a new role search. Your tracker stays available even before you search."
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
            <div className="space-y-3 sm:space-y-4">
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
        <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:rounded-[24px] [&>button]:right-4 [&>button]:top-4 [&>button]:z-20 [&>button]:rounded-full [&>button]:border [&>button]:border-border/70 [&>button]:bg-background/95 [&>button]:p-1 [&>button]:shadow-sm">
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
