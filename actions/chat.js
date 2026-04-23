"use server";

import { revalidatePath } from "next/cache";
import { db, withDbRetry } from "@/lib/prisma";
import { generateJson } from "@/lib/gemini";
import {
  CHAT_ACTION_LABELS,
  CHAT_ACTION_TYPES,
  CHAT_MODES,
  CHAT_SCOPE_TYPES,
} from "@/lib/chat/constants";
import { getJobProviderConfig } from "@/lib/jobs/config";
import {
  buildAtsAnalysis,
  cleanString,
  extractJobSkills,
} from "@/lib/jobs/utils";
import { requireDbUser } from "@/lib/server-user";

function pickSingleValue(value) {
  return Array.isArray(value) ? value[0] : value;
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

function normalizeMode(value) {
  const normalizedValue = cleanString(value).toLowerCase();
  return (
    CHAT_MODES.find((mode) => mode.id === normalizedValue)?.id ||
    CHAT_MODES[0].id
  );
}

function getModeConfig(modeId) {
  return CHAT_MODES.find((mode) => mode.id === modeId) || CHAT_MODES[0];
}

function normalizeAssistantReply(reply) {
  return cleanString(reply)
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`{1,3}([^`]+?)`{1,3}/g, "$1")
    .replace(/^\s*\*\s+/gm, "- ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeConversationJob(job) {
  if (!job) {
    return null;
  }

  const providerConfig = cleanString(job.provider)
    ? getJobProviderConfig(job.provider)
    : null;

  return {
    externalJobId: cleanString(job.externalJobId),
    provider: cleanString(job.provider),
    providerName: providerConfig?.name || cleanString(job.providerName),
    title: cleanString(job.title),
    company: cleanString(job.company),
    location: cleanString(job.location),
    locality: cleanString(job.locality),
    salary: cleanString(job.salary),
    jobType: cleanString(job.jobType),
    postedAt: cleanString(job.postedAt),
    description: cleanString(job.description),
    url: cleanString(job.url),
    applyUrl: cleanString(job.applyUrl),
    sourceUrl: cleanString(job.sourceUrl),
    matchScore:
      typeof job.matchScore === "number"
        ? Math.round(job.matchScore)
        : Number(job.matchScore) || 0,
    matchLevel: cleanString(job.matchLevel),
    keySkills: Array.isArray(job.keySkills) ? job.keySkills.filter(Boolean) : [],
    status: cleanString(job.status) || "saved",
    isSaved: Boolean(job.isSaved),
    atsScore:
      typeof job.atsScore === "number"
        ? Math.round(job.atsScore)
        : job.atsScore == null
          ? null
          : Number(job.atsScore) || null,
    atsSummary: cleanString(job.atsSummary),
    notes: cleanString(job.notes),
  };
}

function serializeChatMessage(record) {
  return {
    id: record.id,
    role: record.role,
    content:
      record.role === "assistant"
        ? normalizeAssistantReply(record.content)
        : cleanString(record.content),
    actions: Array.isArray(record.actions) ? record.actions : [],
    createdAt: record.createdAt?.toISOString?.() || "",
  };
}

function serializeSavedJobForChat(record, resumeContent = "") {
  const providerConfig = getJobProviderConfig(record.provider);

  return buildChatJobSnapshot(
    {
      externalJobId: record.externalJobId,
      provider: record.provider,
      providerName: providerConfig.name,
      title: record.title,
      company: record.companyName,
      location: record.location,
      locality: record.locality,
      salary: record.salaryText,
      jobType: record.jobType,
      postedAt: record.postedAt,
      description: record.description,
      url: record.listingUrl,
      applyUrl: record.applyUrl,
      sourceUrl: record.sourceUrl,
      matchScore: record.matchScore,
      matchLevel: record.matchLevel,
      keySkills: record.keySkills,
      status: record.status,
      isSaved: true,
      atsScore: record.atsScore,
      atsSummary: record.atsSummary,
      notes: record.notes,
    },
    resumeContent
  );
}

function buildTrackerSummary(savedJobs) {
  return savedJobs.reduce(
    (summary, job) => {
      summary.total += 1;
      summary[job.status] = (summary[job.status] || 0) + 1;
      return summary;
    },
    {
      total: 0,
      saved: 0,
      applied: 0,
      interviewing: 0,
      offer: 0,
      archived: 0,
    }
  );
}

function buildJobDescription(job) {
  return [
    cleanString(job.description),
    `Role: ${cleanString(job.title)}.`,
    `Company: ${cleanString(job.company)}.`,
    cleanString(job.location) ? `Location: ${cleanString(job.location)}.` : "",
    cleanString(job.salary) ? `Salary: ${cleanString(job.salary)}.` : "",
    cleanString(job.jobType) ? `Job type: ${cleanString(job.jobType)}.` : "",
    cleanString(job.postedAt) ? `Posted: ${cleanString(job.postedAt)}.` : "",
    cleanString(job.url) ? `Job link: ${cleanString(job.url)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildCoverLetterHref(job) {
  return `/ai-cover-letter/new?${new URLSearchParams({
    companyName: cleanString(job.company),
    jobTitle: cleanString(job.title),
    jobDescription: buildJobDescription(job),
  }).toString()}`;
}

function buildInterviewHref(job) {
  return `/interview/mock?${new URLSearchParams({
    jobTitle: cleanString(job.title),
    companyName: cleanString(job.company),
    jobDescription: cleanString(job.description).slice(0, 3000),
    keySkills: Array.isArray(job.keySkills) ? job.keySkills.join(", ") : "",
  }).toString()}`;
}

function enrichJobForChat(job) {
  if (!job) {
    return null;
  }

  const normalizedJob = normalizeConversationJob(job);

  return {
    ...normalizedJob,
    coverLetterHref: buildCoverLetterHref(normalizedJob),
    interviewHref: buildInterviewHref(normalizedJob),
  };
}

function buildChatJobSnapshot(job, resumeContent = "") {
  const normalizedJob = normalizeConversationJob(job);

  if (!normalizedJob) {
    return null;
  }

  const keySkills =
    normalizedJob.keySkills.length > 0
      ? normalizedJob.keySkills
      : extractJobSkills(normalizedJob);
  const ats = buildAtsAnalysis(
    {
      ...normalizedJob,
      keySkills,
    },
    resumeContent
  );

  return enrichJobForChat({
    ...normalizedJob,
    keySkills,
    atsScore: ats.score ?? normalizedJob.atsScore ?? null,
    atsSummary: ats.summary || normalizedJob.atsSummary,
  });
}

function normalizeConversationMetadata(metadata, resumeContent = "") {
  const normalizedMetadata =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata
      : {};

  return {
    companyName: cleanString(normalizedMetadata.companyName),
    draftPrompt: cleanString(normalizedMetadata.draftPrompt),
    job: buildChatJobSnapshot(normalizedMetadata.job, resumeContent),
  };
}

function serializeConversation(record, resumeContent = "") {
  const metadata = normalizeConversationMetadata(record.metadata, resumeContent);
  const latestMessage =
    Array.isArray(record.messages) && record.messages.length > 0
      ? record.messages[record.messages.length - 1]
      : null;

  return {
    id: record.id,
    title: record.title,
    mode: record.mode,
    scopeType: record.scopeType,
    relatedExternalJobId: cleanString(record.relatedExternalJobId),
    relatedCompanyName: cleanString(record.relatedCompanyName),
    updatedAt: record.updatedAt?.toISOString?.() || "",
    lastMessageAt: record.lastMessageAt?.toISOString?.() || "",
    lastMessagePreview:
      latestMessage?.role === "assistant"
        ? normalizeAssistantReply(latestMessage?.content).slice(0, 140)
        : cleanString(latestMessage?.content).slice(0, 140),
    messageCount: record._count?.messages || 0,
    contextJob: metadata.job,
    companyName: metadata.companyName || cleanString(record.relatedCompanyName),
    messages: Array.isArray(record.messages)
      ? record.messages.map(serializeChatMessage)
      : [],
  };
}

async function getChatUserContext() {
  const user = await requireDbUser({
    select: {
      id: true,
      name: true,
      industry: true,
      skills: true,
      experience: true,
      bio: true,
      resume: {
        select: {
          content: true,
          atsScore: true,
          feedback: true,
        },
      },
      assessments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          quizScore: true,
          improvementTip: true,
          createdAt: true,
        },
      },
      coverLetter: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          createdAt: true,
        },
      },
      savedJobs: {
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 12,
      },
    },
  });

  const savedJobs = user.savedJobs
    .map((job) => serializeSavedJobForChat(job, user.resume?.content || ""))
    .filter(Boolean);
  const topSavedJobs = [...savedJobs]
    .sort((left, right) => (right.matchScore || 0) - (left.matchScore || 0))
    .slice(0, 4);

  return {
    userId: user.id,
    name: cleanString(user.name),
    industry: cleanString(user.industry),
    industryLabel: formatIndustryLabel(user.industry),
    skills: Array.isArray(user.skills) ? user.skills.filter(Boolean) : [],
    experience: user.experience || 0,
    bio: cleanString(user.bio),
    resumeContent: cleanString(user.resume?.content).slice(0, 5000),
    resumeScore:
      typeof user.resume?.atsScore === "number"
        ? Math.round(user.resume.atsScore)
        : null,
    resumeFeedback: cleanString(user.resume?.feedback).slice(0, 400),
    hasResume: Boolean(cleanString(user.resume?.content)),
    assessments: user.assessments.map((assessment) => ({
      id: assessment.id,
      score: Math.round(assessment.quizScore || 0),
      tip: cleanString(assessment.improvementTip),
      createdAt: assessment.createdAt?.toISOString?.() || "",
    })),
    coverLetters: user.coverLetter.map((letter) => ({
      id: letter.id,
      companyName: cleanString(letter.companyName),
      jobTitle: cleanString(letter.jobTitle),
      createdAt: letter.createdAt?.toISOString?.() || "",
    })),
    savedJobs,
    topSavedJobs,
    trackerSummary: buildTrackerSummary(savedJobs),
  };
}

async function getSavedJobContext(userId, externalJobId, resumeContent = "") {
  if (!externalJobId) {
    return null;
  }

  const savedJob = await withDbRetry(() =>
    db.savedJob.findUnique({
      where: {
        userId_externalJobId: {
          userId,
          externalJobId,
        },
      },
    })
  );

  return savedJob ? serializeSavedJobForChat(savedJob, resumeContent) : null;
}

async function buildDraftContext(profile, searchParams) {
  const externalJobId = cleanString(
    pickSingleValue(searchParams?.externalJobId) ?? pickSingleValue(searchParams?.jobId)
  );
  const companyName = cleanString(
    pickSingleValue(searchParams?.companyName) ?? pickSingleValue(searchParams?.company)
  );

  const fallbackJob =
    externalJobId || cleanString(pickSingleValue(searchParams?.title))
      ? buildChatJobSnapshot(
          {
            externalJobId,
            provider: cleanString(pickSingleValue(searchParams?.provider)),
            title: cleanString(pickSingleValue(searchParams?.title)),
            company: companyName,
            location: cleanString(pickSingleValue(searchParams?.location)),
            locality: cleanString(pickSingleValue(searchParams?.locality)),
            salary: cleanString(pickSingleValue(searchParams?.salary)),
            jobType: cleanString(pickSingleValue(searchParams?.jobType)),
            postedAt: cleanString(pickSingleValue(searchParams?.postedAt)),
            description: cleanString(pickSingleValue(searchParams?.description)),
            url: cleanString(pickSingleValue(searchParams?.url)),
            applyUrl: cleanString(pickSingleValue(searchParams?.applyUrl)),
            sourceUrl: cleanString(pickSingleValue(searchParams?.sourceUrl)),
            keySkills: cleanString(pickSingleValue(searchParams?.keySkills))
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
            matchScore:
              Number(cleanString(pickSingleValue(searchParams?.matchScore))) || 0,
            matchLevel: cleanString(pickSingleValue(searchParams?.matchLevel)),
            status: cleanString(pickSingleValue(searchParams?.status)) || "saved",
            isSaved: false,
            atsScore: cleanString(pickSingleValue(searchParams?.atsScore))
              ? Number(cleanString(pickSingleValue(searchParams?.atsScore)))
              : null,
            atsSummary: cleanString(pickSingleValue(searchParams?.atsSummary)),
            notes: cleanString(pickSingleValue(searchParams?.notes)),
          },
          profile.resumeContent
        )
      : null;

  const savedJob = await getSavedJobContext(
    profile.userId,
    externalJobId,
    profile.resumeContent
  );
  const mergedJob =
    savedJob || fallbackJob
      ? buildChatJobSnapshot(
          {
            ...(savedJob || {}),
            ...(fallbackJob || {}),
          },
          profile.resumeContent
        )
      : null;

  if (mergedJob) {
    return {
      scopeType: CHAT_SCOPE_TYPES.JOB,
      companyName: mergedJob.company,
      job: mergedJob,
      draftPrompt: "",
    };
  }

  if (companyName) {
    return {
      scopeType: CHAT_SCOPE_TYPES.COMPANY,
      companyName,
      job: null,
      draftPrompt: "",
    };
  }

  return null;
}

async function getConversationDetails(userId, conversationId, resumeContent = "") {
  if (!conversationId) {
    return null;
  }

  const conversation = await withDbRetry(() =>
    db.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          take: 60,
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })
  );

  return conversation ? serializeConversation(conversation, resumeContent) : null;
}

function buildConversationList(records, resumeContent = "") {
  return records.map((record) => serializeConversation(record, resumeContent));
}

function buildConversationTitle(modeId, draftContext, fallbackMessage) {
  if (draftContext?.job?.title) {
    return `${draftContext.job.title} Plan`;
  }

  if (draftContext?.companyName) {
    return `${draftContext.companyName} Prep`;
  }

  const mode = getModeConfig(modeId);
  const fallbackTitle = cleanString(fallbackMessage)
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");

  return fallbackTitle || mode.label;
}

function buildPromptContext(profile, conversation, recentMessages) {
  const metadata = normalizeConversationMetadata(
    conversation?.metadata,
    profile.resumeContent
  );
  const activeJob = metadata.job;

  return {
    userProfile: {
      industry: profile.industryLabel || profile.industry,
      experienceYears: profile.experience,
      skills: profile.skills.slice(0, 12),
      bio: profile.bio.slice(0, 400),
      hasResume: profile.hasResume,
      resumeScore: profile.resumeScore,
      resumeFeedback: profile.resumeFeedback,
    },
    tracker: {
      summary: profile.trackerSummary,
      topSavedJobs: profile.topSavedJobs.map((job) => ({
        title: job.title,
        company: job.company,
        status: job.status,
        matchScore: job.matchScore,
        atsScore: job.atsScore,
        notes: job.notes,
      })),
    },
    assessments: profile.assessments,
    latestCoverLetters: profile.coverLetters,
    activeScope: {
      mode: getModeConfig(conversation.mode).label,
      scopeType: conversation.scopeType,
      companyName: metadata.companyName || conversation.relatedCompanyName,
      job: activeJob
        ? {
            title: activeJob.title,
            company: activeJob.company,
            location: activeJob.location,
            jobType: activeJob.jobType,
            postedAt: activeJob.postedAt,
            matchScore: activeJob.matchScore,
            atsScore: activeJob.atsScore,
            atsSummary: activeJob.atsSummary,
            status: activeJob.status,
            notes: activeJob.notes,
            keySkills: activeJob.keySkills,
            description: activeJob.description.slice(0, 2500),
          }
        : null,
    },
    recentMessages: recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

function buildAssistantPrompt(profile, conversation, recentMessages, userMessage) {
  const mode = getModeConfig(conversation.mode);
  const contextSnapshot = buildPromptContext(profile, conversation, recentMessages);

  return `
You are Job_Genie, an intelligent career assistant inside a job-search workspace.

Current mode:
- ${mode.label}: ${mode.description}

Important behavior rules:
1. Ground every answer in the provided user context. Do not invent jobs, experience, or recruiter activity.
2. Be direct, practical, and supportive. Short paragraphs are better than generic fluff.
3. If the user asks for prioritization, compare the actual saved jobs and tracker statuses provided.
4. If the user asks what is missing for a role, compare against the active job ATS signals and the user's resume context.
5. If the user asks for a cover letter or interview prep, tailor the answer to the active company/job when available.
6. Keep the reply useful and concrete. Mention exact job titles or companies when relevant.
7. Do not use markdown bold markers, headings, tables, or code fences. Use plain text with short paragraphs and simple dash bullets only when needed.

Allowed action types:
- ${CHAT_ACTION_TYPES.SAVE_JOB}
- ${CHAT_ACTION_TYPES.MOVE_TO_APPLIED}
- ${CHAT_ACTION_TYPES.GENERATE_COVER_LETTER}
- ${CHAT_ACTION_TYPES.PREPARE_INTERVIEW}
- ${CHAT_ACTION_TYPES.ADD_TRACKER_NOTE}

Return valid JSON only in this exact shape:
{
  "reply": "string",
  "conversationTitle": "string",
  "suggestedActionTypes": ["string"],
  "suggestedTrackerNote": "string"
}

Rules for the JSON:
- "conversationTitle" should be short, natural, and at most 6 words.
- "suggestedActionTypes" must only include items from the allowed list.
- Use an empty array if no action is genuinely useful.
- "suggestedTrackerNote" should be empty unless a concise tracker note would help the user.

User context:
${JSON.stringify(contextSnapshot, null, 2)}

Latest user message:
${userMessage}
`;
}

function buildAssistantActions(suggestedActionTypes, suggestedTrackerNote, contextJob) {
  if (!contextJob) {
    return [];
  }

  const allowedActionTypes = new Set(Object.values(CHAT_ACTION_TYPES));
  const requestedActionTypes = Array.isArray(suggestedActionTypes)
    ? suggestedActionTypes.filter((actionType) => allowedActionTypes.has(actionType))
    : [];
  const actionTypes = new Set(requestedActionTypes);

  if (actionTypes.size === 0) {
    actionTypes.add(CHAT_ACTION_TYPES.GENERATE_COVER_LETTER);
    actionTypes.add(CHAT_ACTION_TYPES.PREPARE_INTERVIEW);
  }

  if (!contextJob.isSaved) {
    actionTypes.add(CHAT_ACTION_TYPES.SAVE_JOB);
  }

  if (contextJob.isSaved && contextJob.status !== "applied") {
    actionTypes.add(CHAT_ACTION_TYPES.MOVE_TO_APPLIED);
  }

  if (cleanString(suggestedTrackerNote)) {
    actionTypes.add(CHAT_ACTION_TYPES.ADD_TRACKER_NOTE);
  }

  const actions = [];

  for (const actionType of actionTypes) {
    if (
      [
        CHAT_ACTION_TYPES.SAVE_JOB,
        CHAT_ACTION_TYPES.MOVE_TO_APPLIED,
        CHAT_ACTION_TYPES.ADD_TRACKER_NOTE,
      ].includes(actionType)
    ) {
      actions.push({
        type: actionType,
        label: CHAT_ACTION_LABELS[actionType],
        payload: {
          job: contextJob,
          note: cleanString(suggestedTrackerNote),
        },
      });
      continue;
    }

    if (actionType === CHAT_ACTION_TYPES.GENERATE_COVER_LETTER) {
      actions.push({
        type: actionType,
        label: CHAT_ACTION_LABELS[actionType],
        href: buildCoverLetterHref(contextJob),
      });
      continue;
    }

    if (actionType === CHAT_ACTION_TYPES.PREPARE_INTERVIEW) {
      actions.push({
        type: actionType,
        label: CHAT_ACTION_LABELS[actionType],
        href: buildInterviewHref(contextJob),
      });
    }
  }

  return actions.slice(0, 4);
}

export async function getCareerChatPageData(searchParams) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const profile = await getChatUserContext();
  const requestedConversationId = cleanString(
    pickSingleValue(resolvedSearchParams?.conversationId)
  );
  const fallbackMode = normalizeMode(pickSingleValue(resolvedSearchParams?.mode));
  const draftContext = await buildDraftContext(profile, resolvedSearchParams);

  const conversationList = await withDbRetry(() =>
    db.chatConversation.findMany({
      where: {
        userId: profile.userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: 24,
    })
  );

  let selectedConversation = requestedConversationId
    ? await getConversationDetails(
        profile.userId,
        requestedConversationId,
        profile.resumeContent
      )
    : null;

  if (!selectedConversation && !draftContext && conversationList.length > 0) {
    selectedConversation = await getConversationDetails(
      profile.userId,
      conversationList[0].id,
      profile.resumeContent
    );
  }

  return {
    modes: CHAT_MODES,
    conversations: buildConversationList(conversationList, profile.resumeContent),
    selectedConversation,
    selectedMode: selectedConversation?.mode || fallbackMode,
    draftContext,
    profileSummary: {
      name: profile.name,
      industry: profile.industryLabel || profile.industry,
      experience: profile.experience,
      skills: profile.skills.slice(0, 8),
      hasResume: profile.hasResume,
      resumeScore: profile.resumeScore,
    },
    trackerSummary: profile.trackerSummary,
    savedJobs: profile.savedJobs,
    topSavedJobs: profile.topSavedJobs,
    latestAssessment: profile.assessments[0] || null,
  };
}

export async function sendChatMessage(input) {
  const profile = await getChatUserContext();
  const message = cleanString(input?.message);

  if (!message) {
    throw new Error("Message is required");
  }

  const modeId = normalizeMode(input?.mode);
  const draftContext =
    input?.draftContext && typeof input.draftContext === "object"
      ? {
          scopeType:
            cleanString(input.draftContext.scopeType) || CHAT_SCOPE_TYPES.GENERAL,
          companyName: cleanString(input.draftContext.companyName),
          draftPrompt: cleanString(input.draftContext.draftPrompt),
          job: buildChatJobSnapshot(input.draftContext.job, profile.resumeContent),
        }
      : null;
  const conversationMetadata = draftContext
    ? {
        companyName: draftContext.companyName || draftContext.job?.company || "",
        draftPrompt: draftContext.draftPrompt || "",
        job: draftContext.job,
      }
    : null;

  let conversation = null;
  let createdConversation = false;

  if (cleanString(input?.conversationId)) {
    conversation = await withDbRetry(() =>
      db.chatConversation.findFirst({
        where: {
          id: cleanString(input.conversationId),
          userId: profile.userId,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
            take: 60,
          },
        },
      })
    );
  }

  if (!conversation) {
    createdConversation = true;
    conversation = {
      id: "",
      userId: profile.userId,
      title: buildConversationTitle(modeId, draftContext, message),
      mode: modeId,
      scopeType: draftContext?.scopeType || CHAT_SCOPE_TYPES.GENERAL,
      relatedExternalJobId: draftContext?.job?.externalJobId || null,
      relatedCompanyName:
        draftContext?.companyName || draftContext?.job?.company || null,
      metadata: conversationMetadata,
      messages: [],
    };
  }

  const recentMessages = [
    ...(conversation.messages || []),
    {
      role: "user",
      content: message,
    },
  ].slice(-8);

  const aiResponse = await generateJson({
    prompt: buildAssistantPrompt(profile, conversation, recentMessages, message),
    model: "gemini-2.5-flash",
  });

  const metadata = normalizeConversationMetadata(
    conversation.metadata,
    profile.resumeContent
  );
  const assistantActions = buildAssistantActions(
    aiResponse?.suggestedActionTypes,
    aiResponse?.suggestedTrackerNote,
    metadata.job
  );
  const assistantReply =
    normalizeAssistantReply(aiResponse?.reply) || "I could not generate a reply.";
  const nextConversationTitle =
    createdConversation && cleanString(aiResponse?.conversationTitle)
      ? cleanString(aiResponse.conversationTitle)
      : conversation.title;
  const lastMessageAt = new Date();

  const conversationId = await withDbRetry(() =>
    db.$transaction(async (tx) => {
      if (conversation.id) {
        await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            role: "user",
            content: message,
          },
        });

        await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: assistantReply,
            actions: assistantActions,
          },
        });

        const updatedConversationRecord = await tx.chatConversation.update({
          where: {
            id: conversation.id,
          },
          data: {
            title: nextConversationTitle,
            lastMessageAt,
          },
          select: {
            id: true,
          },
        });

        return updatedConversationRecord.id;
      }

      const createdConversationRecord = await tx.chatConversation.create({
        data: {
          userId: profile.userId,
          title: nextConversationTitle,
          mode: modeId,
          scopeType: draftContext?.scopeType || CHAT_SCOPE_TYPES.GENERAL,
          relatedExternalJobId: draftContext?.job?.externalJobId || null,
          relatedCompanyName:
            draftContext?.companyName || draftContext?.job?.company || null,
          metadata: conversationMetadata,
          lastMessageAt,
          messages: {
            create: [
              {
                role: "user",
                content: message,
              },
              {
                role: "assistant",
                content: assistantReply,
                actions: assistantActions,
              },
            ],
          },
        },
        select: {
          id: true,
        },
      });

      return createdConversationRecord.id;
    })
  );

  const updatedConversation = await getConversationDetails(
    profile.userId,
    conversationId,
    profile.resumeContent
  );

  if (!updatedConversation) {
    throw new Error("Conversation could not be loaded");
  }

  revalidatePath("/career-chat");

  return {
    conversation: updatedConversation,
  };
}

export async function syncConversationJobState(input) {
  const user = await requireDbUser({
    select: {
      id: true,
      resume: {
        select: {
          content: true,
        },
      },
    },
  });

  const conversationId = cleanString(input?.conversationId);
  const normalizedJob = buildChatJobSnapshot(input?.job, user.resume?.content || "");

  if (!conversationId || !normalizedJob) {
    throw new Error("Conversation id and job are required");
  }

  const conversation = await withDbRetry(() =>
    db.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
    })
  );

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const metadata = normalizeConversationMetadata(
    conversation.metadata,
    user.resume?.content || ""
  );

  await withDbRetry(() =>
    db.chatConversation.update({
      where: {
        id: conversationId,
      },
      data: {
        relatedExternalJobId: normalizedJob.externalJobId || null,
        relatedCompanyName: normalizedJob.company || metadata.companyName || null,
        metadata: {
          ...metadata,
          companyName: normalizedJob.company || metadata.companyName || "",
          job: normalizedJob,
        },
      },
    })
  );

  revalidatePath("/career-chat");

  return {
    conversationId,
    job: normalizedJob,
  };
}

export async function clearConversationContext(input) {
  const user = await requireDbUser({
    select: {
      id: true,
    },
  });

  const conversationId = cleanString(input?.conversationId);

  if (!conversationId) {
    throw new Error("Conversation id is required");
  }

  const conversation = await withDbRetry(() =>
    db.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
    })
  );

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const metadata = normalizeConversationMetadata(conversation.metadata);

  await withDbRetry(() =>
    db.chatConversation.update({
      where: {
        id: conversationId,
      },
      data: {
        scopeType: CHAT_SCOPE_TYPES.GENERAL,
        relatedExternalJobId: null,
        relatedCompanyName: null,
        metadata: {
          ...metadata,
          companyName: "",
          job: null,
        },
      },
    })
  );

  revalidatePath("/career-chat");

  return {
    conversationId,
    scopeType: CHAT_SCOPE_TYPES.GENERAL,
  };
}

export async function deleteChatConversation(input) {
  const user = await requireDbUser({
    select: {
      id: true,
    },
  });

  const conversationId = cleanString(input?.conversationId);

  if (!conversationId) {
    throw new Error("Conversation id is required");
  }

  const conversation = await withDbRetry(() =>
    db.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    })
  );

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  await withDbRetry(() =>
    db.chatConversation.delete({
      where: {
        id: conversationId,
      },
    })
  );

  revalidatePath("/career-chat");

  return {
    conversationId,
  };
}
