"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { getJobProviderConfig, getJobsConfig } from "@/lib/jobs/config";
import { DEFAULT_JOB_STATUS, JOB_APPLICATION_STATUSES } from "@/lib/jobs/constants";
import {
  fetchCompanyJobs,
  fetchJobDetailFromProvider,
  fetchJobsFromProvider,
} from "@/lib/jobs/provider";
import {
  buildAtsAnalysis,
  cleanString,
  extractJobSkills,
  scoreJobMatch,
  splitExternalJobId,
} from "@/lib/jobs/utils";

function pickSingleValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeLocality(value, defaultLocality) {
  const normalizedValue = cleanString(value).toLowerCase() || defaultLocality;

  if (normalizedValue === "uk") {
    return "gb";
  }

  return normalizedValue;
}

function normalizeProvider(value, defaultProvider) {
  const normalizedValue = cleanString(value).toLowerCase();
  return normalizedValue || defaultProvider;
}

function buildNormalizedExternalJobId(value, provider) {
  const parsedExternalJobId = splitExternalJobId(value);

  if (!parsedExternalJobId.rawId) {
    return "";
  }

  if (parsedExternalJobId.provider) {
    return cleanString(value);
  }

  return `${provider}:${parsedExternalJobId.rawId}`;
}

function formatIndustryLabel(industry) {
  if (!industry) {
    return "";
  }

  return industry
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSearchCriteria(
  searchParams,
  defaultLocality,
  defaultProvider
) {
  return {
    provider: normalizeProvider(
      pickSingleValue(searchParams?.provider),
      defaultProvider
    ),
    company: cleanString(pickSingleValue(searchParams?.company)),
    query: cleanString(
      pickSingleValue(searchParams?.query) ?? pickSingleValue(searchParams?.role)
    ),
    locality: normalizeLocality(
      pickSingleValue(searchParams?.locality),
      defaultLocality
    ),
    start: cleanString(pickSingleValue(searchParams?.start)) || "1",
  };
}

function buildProfileSummary(profile, defaultLocality, providerName) {
  return {
    industry: profile.industryLabel,
    experience: profile.experience,
    skills: profile.skills || [],
    hasResume: Boolean(profile.resumeContent),
    defaultLocality,
    providerName,
  };
}

function normalizeJobStatus(status) {
  const normalizedStatus = cleanString(status).toLowerCase();

  return JOB_APPLICATION_STATUSES.some(
    (option) => option.value === normalizedStatus
  )
    ? normalizedStatus
    : DEFAULT_JOB_STATUS;
}

function serializeSavedJob(record) {
  const providerConfig = getJobProviderConfig(record.provider);

  return {
    id: record.id,
    externalJobId: record.externalJobId,
    provider: record.provider,
    providerName: providerConfig.name,
    title: record.title,
    company: record.companyName,
    location: record.location || "",
    locality: record.locality || "",
    postedAt: record.postedAt || "",
    salary: record.salaryText || "",
    jobType: record.jobType || "",
    description: record.description || "",
    url: record.listingUrl || "",
    applyUrl: record.applyUrl || "",
    sourceUrl: record.sourceUrl || "",
    matchScore:
      typeof record.matchScore === "number" ? Math.round(record.matchScore) : 0,
    matchLevel: record.matchLevel || "Saved",
    matchReasons: Array.isArray(record.matchReasons) ? record.matchReasons : [],
    keySkills: Array.isArray(record.keySkills) ? record.keySkills : [],
    status: normalizeJobStatus(record.status),
    notes: record.notes || "",
    atsScore:
      typeof record.atsScore === "number" ? Math.round(record.atsScore) : null,
    atsSummary: record.atsSummary || "",
    isSaved: true,
    createdAt: record.createdAt?.toISOString?.() || "",
    updatedAt: record.updatedAt?.toISOString?.() || "",
  };
}

function mergeSavedState(job, savedJobsById) {
  const existingSavedJob = savedJobsById.get(
    cleanString(job.externalJobId || job.id)
  );

  if (!existingSavedJob) {
    return {
      ...job,
      isSaved: false,
      status: DEFAULT_JOB_STATUS,
      notes: "",
    };
  }

  return {
    ...job,
    ...existingSavedJob,
    matchScore: job.matchScore ?? existingSavedJob.matchScore,
    matchLevel: job.matchLevel ?? existingSavedJob.matchLevel,
    matchReasons:
      job.matchReasons?.length > 0
        ? job.matchReasons
        : existingSavedJob.matchReasons,
    keySkills:
      existingSavedJob.keySkills?.length > 0
        ? existingSavedJob.keySkills
        : job.keySkills,
    atsScore:
      typeof job.atsScore === "number" ? job.atsScore : existingSavedJob.atsScore,
    atsSummary: job.atsSummary || existingSavedJob.atsSummary,
    atsMatchedKeywords:
      job.atsMatchedKeywords?.length > 0
        ? job.atsMatchedKeywords
        : existingSavedJob.atsMatchedKeywords || [],
    atsMissingKeywords:
      job.atsMissingKeywords?.length > 0
        ? job.atsMissingKeywords
        : existingSavedJob.atsMissingKeywords || [],
    url: job.url || existingSavedJob.url,
    sourceUrl: job.sourceUrl || existingSavedJob.sourceUrl,
  };
}

function buildTrackerSummary(savedJobs) {
  return JOB_APPLICATION_STATUSES.map((option) => ({
    ...option,
    count: savedJobs.filter((job) => job.status === option.value).length,
  }));
}

function buildJobInsights(job, profile) {
  const keySkills =
    Array.isArray(job?.keySkills) && job.keySkills.length > 0
      ? job.keySkills
      : extractJobSkills(job, profile.skills);
  const ats = buildAtsAnalysis(
    {
      ...job,
      keySkills,
    },
    profile.resumeContent
  );

  return {
    keySkills,
    atsScore: ats.score,
    atsSummary: ats.summary,
    atsMatchedKeywords: ats.matchedKeywords,
    atsMissingKeywords: ats.missingKeywords,
    resumeAvailable: Boolean(profile.resumeContent),
  };
}

async function getUserRecord() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      id: true,
      industry: true,
      skills: true,
      experience: true,
      bio: true,
      resume: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    ...user,
    industryLabel: formatIndustryLabel(user.industry),
    resumeContent: user.resume?.content || "",
  };
}

async function getSavedJobsSafe(userId) {
  try {
    const savedJobs = await db.savedJob.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return savedJobs.map(serializeSavedJob);
  } catch (error) {
    console.error("Error loading saved jobs:", error);
    return [];
  }
}

async function getSavedJobByExternalIdSafe(userId, externalJobId) {
  try {
    const savedJob = await db.savedJob.findUnique({
      where: {
        userId_externalJobId: {
          userId,
          externalJobId,
        },
      },
    });

    return savedJob ? serializeSavedJob(savedJob) : null;
  } catch (error) {
    console.error("Error loading saved job detail:", error);
    return null;
  }
}

function buildPageResponse({
  config,
  providerConfig,
  criteria,
  profile,
  savedJobs,
  jobs = [],
  hasSearched = false,
  total = 0,
  nextCursor = null,
  prevCursor = null,
  sourceUrl = "",
  error = "",
}) {
  const profileSummary = buildProfileSummary(
    profile,
    config.defaultLocality,
    providerConfig.name
  );

  return {
    defaults: {
      provider: criteria.provider,
      company: criteria.company,
      query: criteria.query,
      locality: criteria.locality,
      profileSummary,
    },
    results: {
      hasSearched,
      provider: providerConfig.id,
      providerName: providerConfig.name,
      criteria,
      jobs,
      total,
      nextCursor,
      prevCursor,
      sourceUrl,
      profileSummary,
    },
    savedJobs,
    trackerSummary: buildTrackerSummary(savedJobs),
    statusOptions: JOB_APPLICATION_STATUSES,
    availableProviders: config.availableProviders,
    error,
  };
}

function buildJobDescription(job) {
  return [
    cleanString(job.description),
    "Opportunity sourced from your jobs search workspace.",
    `Role: ${job.title}.`,
    `Company: ${job.company}.`,
    job.location ? `Location: ${job.location}.` : "",
    job.salary ? `Salary: ${job.salary}.` : "",
    job.jobType ? `Job type: ${job.jobType}.` : "",
    job.postedAt ? `Posted: ${job.postedAt}.` : "",
    job.url ? `Job link: ${job.url}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildSearchErrorMessage(error) {
  const message = cleanString(error?.message);

  if (message.includes("monthly quota")) {
    return "Live jobs are unavailable because the current RapidAPI plan has exhausted its monthly quota. Add a fresh key or upgrade the plan.";
  }

  if (message.includes("rate-limiting") || message.includes("429")) {
    return "The jobs provider is rate-limiting requests right now. Wait a minute, then search again.";
  }

  return message || "Unable to load job recommendations";
}

export async function getJobsPageData(searchParams) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const config = getJobsConfig();
  const profile = await getUserRecord();
  const criteria = normalizeSearchCriteria(
    resolvedSearchParams,
    config.defaultLocality,
    config.defaultProvider
  );
  const providerConfig = getJobProviderConfig(criteria.provider);
  criteria.provider = providerConfig.id;
  const savedJobs = (await getSavedJobsSafe(profile.id)).map((job) => ({
    ...job,
    ...buildJobInsights(job, profile),
  }));
  const savedJobsById = new Map(
    savedJobs.map((job) => [cleanString(job.externalJobId), job])
  );

  if (!criteria.query) {
    return buildPageResponse({
      config,
      providerConfig,
      criteria,
      profile,
      savedJobs,
    });
  }

  try {
    let providerResult = await fetchJobsFromProvider(criteria);
    let filteredJobs = criteria.company
      ? providerResult.jobs.filter((job) =>
          cleanString(job.company)
            .toLowerCase()
            .includes(criteria.company.toLowerCase())
        )
      : providerResult.jobs;

    if (
      providerConfig.supportsCompanyEndpoint &&
      criteria.company &&
      filteredJobs.length === 0
    ) {
      const companyResult = await fetchCompanyJobs(criteria);

      if (companyResult.jobs.length > 0) {
        providerResult = companyResult;
        filteredJobs = companyResult.jobs;
      }
    }

    const rankedJobs = filteredJobs
      .map((job) => {
        const insights = buildJobInsights(job, profile);

        return {
          ...job,
          ...insights,
          detailLoaded: Boolean(
            cleanString(job.description).length > 80 || cleanString(job.applyUrl)
          ),
          ...scoreJobMatch(job, criteria, profile),
        };
      })
      .sort((left, right) => right.matchScore - left.matchScore)
      .map((job) => mergeSavedState(job, savedJobsById));

    return buildPageResponse({
      config,
      providerConfig,
      criteria,
      profile,
      savedJobs,
      jobs: rankedJobs,
      hasSearched: true,
      total: providerResult.total || rankedJobs.length,
      nextCursor: providerResult.nextCursor,
      prevCursor: providerResult.prevCursor,
      sourceUrl: providerResult.sourceUrl,
    });
  } catch (error) {
    return buildPageResponse({
      config,
      providerConfig,
      criteria,
      profile,
      savedJobs,
      hasSearched: true,
      error: buildSearchErrorMessage(error),
    });
  }
}

export async function getJobDetail({ jobId, locality, fallbackJob }) {
  const normalizedJobId =
    cleanString(jobId) || cleanString(fallbackJob?.externalJobId);

  if (!normalizedJobId) {
    throw new Error("Job id is required");
  }

  const config = getJobsConfig();
  const parsedExternalJobId = splitExternalJobId(normalizedJobId);
  const providerId =
    cleanString(fallbackJob?.provider).toLowerCase() ||
    parsedExternalJobId.provider ||
    config.defaultProvider;
  const rawJobId =
    cleanString(fallbackJob?.id) ||
    parsedExternalJobId.rawId ||
    normalizedJobId;
  const providerConfig = getJobProviderConfig(providerId);
  const profile = await getUserRecord();
  const savedJob = await getSavedJobByExternalIdSafe(profile.id, normalizedJobId);

  let detail = savedJob;

  const savedJobHasUsableDetail =
    savedJob &&
    (cleanString(savedJob.description).length > 80 || cleanString(savedJob.applyUrl));

  if (!savedJobHasUsableDetail) {
    try {
      detail = await fetchJobDetailFromProvider({
        provider: providerConfig.id,
        jobId: rawJobId,
        locality: cleanString(locality) || config.defaultLocality,
        fallbackJob,
      });
    } catch (error) {
      console.error("Error loading provider job detail:", error);

      if (!savedJob && !fallbackJob) {
        throw error;
      }

      detail = savedJob || fallbackJob;
    }
  }

  const mergedJob = {
    ...(fallbackJob || {}),
    ...(savedJob || {}),
    ...(detail || {}),
  };

  const keySkills =
    mergedJob.keySkills?.length > 0
      ? mergedJob.keySkills
      : extractJobSkills(mergedJob, profile.skills);
  const ats = buildAtsAnalysis(mergedJob, profile.resumeContent);

  return {
    ...mergedJob,
    externalJobId: cleanString(mergedJob.externalJobId || mergedJob.id),
    keySkills,
    status: normalizeJobStatus(mergedJob.status),
    notes: mergedJob.notes || "",
    atsScore: ats.score ?? mergedJob.atsScore ?? null,
    atsSummary: ats.summary || mergedJob.atsSummary || "",
    atsMatchedKeywords: ats.matchedKeywords || [],
    atsMissingKeywords: ats.missingKeywords || [],
    resumeAvailable: Boolean(profile.resumeContent),
    provider: providerConfig.id,
    providerName: providerConfig.name,
    coverLetterHref: `/ai-cover-letter/new?${new URLSearchParams({
      companyName: cleanString(mergedJob.company),
      jobTitle: cleanString(mergedJob.title),
      jobDescription: buildJobDescription(mergedJob),
    }).toString()}`,
    interviewHref: `/interview/mock?${new URLSearchParams({
      jobTitle: cleanString(mergedJob.title),
      companyName: cleanString(mergedJob.company),
      jobDescription: cleanString(mergedJob.description).slice(0, 3000),
      keySkills: keySkills.join(", "),
    }).toString()}`,
  };
}

export async function saveJob(jobInput) {
  const profile = await getUserRecord();
  const config = getJobsConfig();
  const rawExternalJobId = cleanString(jobInput?.externalJobId || jobInput?.id);
  const parsedExternalJobId = splitExternalJobId(rawExternalJobId);
  const providerId =
    cleanString(jobInput?.provider).toLowerCase() ||
    parsedExternalJobId.provider ||
    config.defaultProvider;
  const providerConfig = getJobProviderConfig(providerId);
  const externalJobId = buildNormalizedExternalJobId(
    rawExternalJobId,
    providerConfig.id
  );
  const title = cleanString(jobInput?.title);
  const companyName = cleanString(jobInput?.company);
  const description = cleanString(jobInput?.description);
  const keySkills =
    Array.isArray(jobInput?.keySkills) && jobInput.keySkills.length > 0
      ? jobInput.keySkills.filter(Boolean)
      : extractJobSkills(
          {
            title,
            company: companyName,
            description,
          },
          profile.skills
        );
  const ats = buildAtsAnalysis(
    {
      title,
      company: companyName,
      description,
      keySkills,
    },
    profile.resumeContent
  );
  const atsScore =
    ats.score ?? (typeof jobInput?.atsScore === "number" ? jobInput.atsScore : null);
  const atsSummary = ats.summary || cleanString(jobInput?.atsSummary) || null;

  if (!externalJobId || !title || !companyName) {
    throw new Error("Missing job information");
  }

  try {
    const savedJob = await db.savedJob.upsert({
      where: {
        userId_externalJobId: {
          userId: profile.id,
          externalJobId,
        },
      },
      update: {
        provider: providerConfig.id,
        title,
        companyName,
        location: cleanString(jobInput?.location) || null,
        locality: cleanString(jobInput?.locality) || null,
        listingUrl: cleanString(jobInput?.url) || null,
        applyUrl: cleanString(jobInput?.applyUrl) || null,
        sourceUrl: cleanString(jobInput?.sourceUrl) || null,
        salaryText: cleanString(jobInput?.salary) || null,
        jobType: cleanString(jobInput?.jobType) || null,
        postedAt: cleanString(jobInput?.postedAt) || null,
        description: description || null,
        matchScore:
          typeof jobInput?.matchScore === "number" ? jobInput.matchScore : null,
        matchLevel: cleanString(jobInput?.matchLevel) || null,
        matchReasons: Array.isArray(jobInput?.matchReasons)
          ? jobInput.matchReasons.filter(Boolean)
          : [],
        keySkills,
        status: normalizeJobStatus(jobInput?.status),
        notes: cleanString(jobInput?.notes) || null,
        atsScore,
        atsSummary,
      },
      create: {
        userId: profile.id,
        provider: providerConfig.id,
        externalJobId,
        title,
        companyName,
        location: cleanString(jobInput?.location) || null,
        locality: cleanString(jobInput?.locality) || null,
        listingUrl: cleanString(jobInput?.url) || null,
        applyUrl: cleanString(jobInput?.applyUrl) || null,
        sourceUrl: cleanString(jobInput?.sourceUrl) || null,
        salaryText: cleanString(jobInput?.salary) || null,
        jobType: cleanString(jobInput?.jobType) || null,
        postedAt: cleanString(jobInput?.postedAt) || null,
        description: description || null,
        matchScore:
          typeof jobInput?.matchScore === "number" ? jobInput.matchScore : null,
        matchLevel: cleanString(jobInput?.matchLevel) || null,
        matchReasons: Array.isArray(jobInput?.matchReasons)
          ? jobInput.matchReasons.filter(Boolean)
          : [],
        keySkills,
        status: normalizeJobStatus(jobInput?.status),
        notes: cleanString(jobInput?.notes) || null,
        atsScore,
        atsSummary,
      },
    });

    revalidatePath("/jobs");
    return serializeSavedJob(savedJob);
  } catch (error) {
    console.error("Error saving job:", error);
    throw new Error(
      "Unable to save this job right now. Make sure the latest Prisma migration is applied."
    );
  }
}

export async function updateSavedJob(jobInput) {
  const profile = await getUserRecord();
  const config = getJobsConfig();
  const providerId =
    cleanString(jobInput?.provider).toLowerCase() ||
    splitExternalJobId(cleanString(jobInput?.externalJobId || jobInput?.id))
      .provider ||
    config.defaultProvider;
  const externalJobId = buildNormalizedExternalJobId(
    cleanString(jobInput?.externalJobId || jobInput?.id),
    providerId
  );

  if (!externalJobId) {
    throw new Error("Saved job id is required");
  }

  try {
    const savedJob = await db.savedJob.update({
      where: {
        userId_externalJobId: {
          userId: profile.id,
          externalJobId,
        },
      },
      data: {
        status:
          jobInput?.status != null
            ? normalizeJobStatus(jobInput.status)
            : undefined,
        notes:
          jobInput?.notes != null ? cleanString(jobInput.notes) || null : undefined,
        atsScore:
          typeof jobInput?.atsScore === "number" ? jobInput.atsScore : undefined,
        atsSummary:
          jobInput?.atsSummary != null
            ? cleanString(jobInput.atsSummary) || null
            : undefined,
      },
    });

    revalidatePath("/jobs");
    return serializeSavedJob(savedJob);
  } catch (error) {
    console.error("Error updating saved job:", error);
    throw new Error("Unable to update this saved job right now.");
  }
}

export async function deleteSavedJob(jobInput) {
  const profile = await getUserRecord();
  const config = getJobsConfig();
  const providerId =
    cleanString(jobInput?.provider).toLowerCase() ||
    splitExternalJobId(cleanString(jobInput?.externalJobId || jobInput?.id))
      .provider ||
    config.defaultProvider;
  const externalJobId = buildNormalizedExternalJobId(
    cleanString(jobInput?.externalJobId || jobInput?.id),
    providerId
  );

  if (!externalJobId) {
    throw new Error("Saved job id is required");
  }

  try {
    await db.savedJob.delete({
      where: {
        userId_externalJobId: {
          userId: profile.id,
          externalJobId,
        },
      },
    });

    revalidatePath("/jobs");

    return {
      externalJobId,
      provider: providerId,
    };
  } catch (error) {
    console.error("Error deleting saved job:", error);
    throw new Error("Unable to remove this job from your tracker right now.");
  }
}
