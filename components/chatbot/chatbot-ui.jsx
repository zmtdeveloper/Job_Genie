"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Brain,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  History,
  Loader2,
  MessageSquare,
  Plus,
  SendHorizontal,
  Sparkles,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  deleteChatConversation,
  sendChatMessage,
  syncConversationJobState,
} from "@/actions/chat";
import { saveJob, updateSavedJob } from "@/actions/jobs";
import { CHAT_ACTION_TYPES, CHAT_MODES } from "@/lib/chat/constants";
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
import { Textarea } from "@/components/ui/textarea";

const MODE_ICONS = {
  "career-coach": Brain,
  "resume-reviewer": FileText,
  "job-strategist": Target,
  "interview-coach": GraduationCap,
};

function formatRelativeTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const diffInMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (diffInMinutes < 1) {
    return "Just now";
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.round(diffInHours / 24);
  return `${diffInDays}d ago`;
}

function getConversationKey(conversation) {
  return conversation?.id || "";
}

function sortConversations(conversations) {
  return [...conversations].sort((left, right) => {
    return (
      new Date(right.lastMessageAt || right.updatedAt || 0).getTime() -
      new Date(left.lastMessageAt || left.updatedAt || 0).getTime()
    );
  });
}

function upsertConversation(conversations, nextConversation) {
  const remainingConversations = conversations.filter(
    (conversation) => conversation.id !== nextConversation.id
  );

  return sortConversations([nextConversation, ...remainingConversations]);
}

function removeConversation(conversations, conversationId) {
  return conversations.filter((conversation) => conversation.id !== conversationId);
}

function patchConversationJob(conversation, nextJobState) {
  if (!conversation?.contextJob) {
    return conversation;
  }

  return {
    ...conversation,
    contextJob: {
      ...conversation.contextJob,
      ...nextJobState,
    },
  };
}

function patchConversationCollection(conversations, conversationId, nextJobState) {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? patchConversationJob(conversation, nextJobState)
      : conversation
  );
}

function findMode(modeId) {
  return CHAT_MODES.find((mode) => mode.id === modeId) || CHAT_MODES[0];
}

function MessageBubble({ message, onAction }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm",
          isAssistant
            ? "border-border/70 bg-card"
            : "border-slate-900 bg-slate-950 text-white"
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {isAssistant ? (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Copilot
            </>
          ) : (
            <>
              <UserRound className="h-3.5 w-3.5" />
              You
            </>
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>

        {isAssistant && Array.isArray(message.actions) && message.actions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.actions.map((action, index) =>
              action.href ? (
                <Button key={`${action.type}-${index}`} size="sm" variant="outline" asChild>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ) : (
                <Button
                  key={`${action.type}-${index}`}
                  size="sm"
                  variant="outline"
                  onClick={() => onAction(action)}
                >
                  {action.label}
                </Button>
              )
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ChatbotUI({
  initialConversations,
  initialConversation,
  initialMode,
  draftContext,
  profileSummary,
  trackerSummary,
  topSavedJobs,
  latestAssessment,
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const [activeMode, setActiveMode] = useState(initialConversation?.mode || initialMode);
  const [draftState, setDraftState] = useState(draftContext);
  const [input, setInput] = useState("");
  const messageEndRef = useRef(null);

  const { loading: sendingMessage, fn: sendMessageFn } = useFetch(sendChatMessage);
  const { loading: deletingConversation, fn: deleteConversationFn } =
    useFetch(deleteChatConversation);
  const { fn: syncConversationJobStateFn } = useFetch(syncConversationJobState);
  const { loading: savingJob, fn: saveJobFn } = useFetch(saveJob);
  const { loading: updatingJob, fn: updateSavedJobFn } = useFetch(updateSavedJob);

  const activeModeConfig = findMode(activeConversation?.mode || activeMode);
  const activeMessages = activeConversation?.messages || [];
  const activeContextJob = activeConversation?.contextJob || draftState?.job || null;
  const activeContextCompany =
    activeConversation?.companyName || draftState?.companyName || "";
  const isActionLoading = Boolean(savingJob || updatingJob);
  const isDeletingActiveConversation =
    deletingConversation && Boolean(activeConversation?.id);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, sendingMessage]);

  const sessionStats = useMemo(
    () => ({
      totalSessions: conversations.length,
      trackedJobs: trackerSummary.total || 0,
      resumeScore: profileSummary.resumeScore || 0,
    }),
    [conversations.length, profileSummary.resumeScore, trackerSummary.total]
  );

  const startDraftConversation = (nextMode, nextDraftContext = null) => {
    setActiveConversation(null);
    setActiveMode(nextMode);
    setDraftState(nextDraftContext);
    setInput("");
  };

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    setActiveMode(conversation.mode);
    setDraftState(null);
  };

  const handleSendMessage = async () => {
    const normalizedInput = input.trim();

    if (!normalizedInput) {
      return;
    }

    const response = await sendMessageFn({
      conversationId: activeConversation?.id,
      mode: activeConversation?.mode || activeMode,
      message: normalizedInput,
      draftContext: activeConversation ? null : draftState,
    });

    if (!response?.conversation) {
      return;
    }

    setInput("");
    setActiveConversation(response.conversation);
    setActiveMode(response.conversation.mode);
    setDraftState(null);
    setConversations((currentConversations) =>
      upsertConversation(currentConversations, response.conversation)
    );
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!conversationId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this chat? Its messages and memory will be removed."
    );

    if (!confirmed) {
      return;
    }

    const response = await deleteConversationFn({ conversationId });

    if (!response?.conversationId) {
      return;
    }

    const nextConversations = sortConversations(
      removeConversation(conversations, response.conversationId)
    );

    setConversations(nextConversations);

    if (activeConversation?.id === response.conversationId) {
      const nextActiveConversation = nextConversations[0] || null;
      setActiveConversation(nextActiveConversation);
      setActiveMode(
        nextActiveConversation?.mode || activeConversation?.mode || activeMode
      );
      setDraftState(null);
      setInput("");
    }

    toast.success("Chat deleted");
  };

  const handleChatAction = async (action) => {
    const job = action?.payload?.job;

    if (!job) {
      return;
    }

    if (action.type === CHAT_ACTION_TYPES.SAVE_JOB) {
      const savedJob = await saveJobFn(job);

      if (savedJob) {
        const nextJobState = {
          ...savedJob,
          isSaved: true,
        };
        if (activeConversation?.id) {
          await syncConversationJobStateFn({
            conversationId: activeConversation.id,
            job: nextJobState,
          });
        }
        setActiveConversation((currentConversation) =>
          currentConversation
            ? patchConversationJob(currentConversation, nextJobState)
            : currentConversation
        );
        setConversations((currentConversations) =>
          patchConversationCollection(
            currentConversations,
            activeConversation?.id,
            nextJobState
          )
        );
        toast.success("Job saved from chat");
      }

      return;
    }

    if (action.type === CHAT_ACTION_TYPES.MOVE_TO_APPLIED) {
      const result = job.isSaved
        ? await updateSavedJobFn({
            externalJobId: job.externalJobId,
            provider: job.provider,
            status: "applied",
          })
        : await saveJobFn({
            ...job,
            status: "applied",
          });

      if (result) {
        const nextJobState = {
          ...result,
          isSaved: true,
          status: "applied",
        };
        if (activeConversation?.id) {
          await syncConversationJobStateFn({
            conversationId: activeConversation.id,
            job: nextJobState,
          });
        }
        setActiveConversation((currentConversation) =>
          currentConversation
            ? patchConversationJob(currentConversation, nextJobState)
            : currentConversation
        );
        setConversations((currentConversations) =>
          patchConversationCollection(
            currentConversations,
            activeConversation?.id,
            nextJobState
          )
        );
        toast.success("Job moved to applied");
      }

      return;
    }

    if (action.type === CHAT_ACTION_TYPES.ADD_TRACKER_NOTE) {
      const note = action?.payload?.note?.trim();

      if (!note) {
        toast.error("No tracker note was suggested for this message");
        return;
      }

      const result = job.isSaved
        ? await updateSavedJobFn({
            externalJobId: job.externalJobId,
            provider: job.provider,
            notes: note,
          })
        : await saveJobFn({
            ...job,
            notes: note,
          });

      if (result) {
        const nextJobState = {
          ...result,
          isSaved: true,
          notes: result.notes || note,
        };
        if (activeConversation?.id) {
          await syncConversationJobStateFn({
            conversationId: activeConversation.id,
            job: nextJobState,
          });
        }
        setActiveConversation((currentConversation) =>
          currentConversation
            ? patchConversationJob(currentConversation, nextJobState)
            : currentConversation
        );
        setConversations((currentConversations) =>
          patchConversationCollection(
            currentConversations,
            activeConversation?.id,
            nextJobState
          )
        );
        toast.success("Tracker note saved from chat");
      }
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-1">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 text-white shadow-2xl">
        <CardHeader className="space-y-3 pb-5">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/10 px-3 text-white hover:bg-white/10">
              Context-aware career copilot
            </Badge>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Chat With Context & Take Action.
              </h1>
              <p className="max-w-2xl text-sm text-slate-300 md:text-base">
                Profile, resume, saved jobs, ATS signals, and tracker history all stay in the loop so the assistant can guide your next move.
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() => startDraftConversation(activeMode, null)}
              className="h-10 bg-white text-slate-950 hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                Active Mode
              </p>
              <p className="mt-2 text-xl font-semibold">{activeModeConfig.label}</p>
              <p className="mt-2 text-sm text-slate-300">
                {activeModeConfig.description}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                Sessions
              </p>
              <p className="mt-2 text-xl font-semibold">{sessionStats.totalSessions}</p>
              <p className="mt-2 text-sm text-slate-300">
                {sessionStats.trackedJobs} tracked roles and memory-backed conversations
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                Resume Signal
              </p>
              <p className="mt-2 text-xl font-semibold">
                {profileSummary.hasResume ? profileSummary.resumeScore || "Ready" : "Missing"}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {profileSummary.hasResume
                  ? "Resume context is available for ATS and positioning advice."
                  : "Add a resume to unlock sharper ATS and job-fit guidance."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <Card className="border border-border/70 shadow-xl">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5" />
              Saved Chats
            </CardTitle>
            <CardDescription>
              General, job-specific, company-specific, and interview sessions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              {CHAT_MODES.map((mode) => {
                const Icon = MODE_ICONS[mode.id] || Sparkles;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      startDraftConversation(
                        mode.id,
                        draftState && mode.id === activeMode ? draftState : null
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
                      (activeConversation?.mode || activeMode) === mode.id
                        ? "border-slate-900 bg-slate-950 text-white"
                        : "border-border/70 bg-background hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "rounded-2xl border p-4 transition-all",
                      getConversationKey(activeConversation) === conversation.id
                        ? "border-slate-900 bg-slate-950/5 shadow-lg"
                        : "border-border/70 bg-card shadow-sm hover:-translate-y-0.5 hover:shadow-lg"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectConversation(conversation)}
                        className="flex-1 text-left"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{findMode(conversation.mode).label}</Badge>
                            <Badge variant="outline">{conversation.scopeType}</Badge>
                          </div>
                          <p className="text-sm font-semibold">{conversation.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {conversation.lastMessagePreview || "No messages yet"}
                          </p>
                        </div>
                      </button>

                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(
                            conversation.lastMessageAt || conversation.updatedAt
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteConversation(conversation.id)}
                          disabled={deletingConversation}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${conversation.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  Start your first conversation. The assistant will remember it here.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-xl">
          <CardHeader className="space-y-4 border-b bg-muted/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="text-2xl gradient-title md:text-3xl">
                  {activeConversation?.title || activeModeConfig.label}
                </CardTitle>
                <CardDescription className="mt-2">
                  {activeConversation
                    ? "Conversation memory stays attached to this session."
                    : "Start a fresh conversation with the mode and context you need."}
                </CardDescription>
              </div>

              <Badge variant="outline" className="w-fit">
                {activeConversation?.scopeType || draftState?.scopeType || "general"}
              </Badge>
            </div>

            {activeConversation ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteConversation(activeConversation.id)}
                  disabled={deletingConversation}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Chat
                </Button>
              </div>
            ) : null}

            {activeContextJob ? (
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Role Context Loaded
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {activeContextJob.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeContextJob.company}
                  {activeContextJob.location ? ` • ${activeContextJob.location}` : ""}
                </p>
              </div>
            ) : activeContextCompany ? (
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Company Context Loaded
                </p>
                <p className="mt-2 text-lg font-semibold">{activeContextCompany}</p>
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4 p-4">
            <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1">
              {activeMessages.length > 0 ? (
                activeMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onAction={handleChatAction}
                  />
                ))
              ) : (
                <Card className="border-dashed shadow-none">
                  <CardHeader>
                    <CardTitle className="text-xl">Smart prompts to start fast</CardTitle>
                    <CardDescription>
                      The assistant already knows your profile context. Pick a prompt or type your own.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {activeModeConfig.emptyPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        onClick={() => handleQuickPrompt(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}

              {sendingMessage ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Copilot is thinking...
                    </div>
                  </div>
                </div>
              ) : null}

              <div ref={messageEndRef} />
            </div>

            <div className="rounded-2xl border bg-background p-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your saved jobs, resume gaps, ATS match, cover letters, or interview prep..."
                className="min-h-28 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Ask in plain language. The assistant can respond with actions when job context is available.
                </p>

                <Button
                  onClick={handleSendMessage}
                  disabled={
                    sendingMessage || isActionLoading || isDeletingActiveConversation
                  }
                  className="h-10"
                >
                  <SendHorizontal className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border border-border/70 shadow-xl">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-xl">Current Context</CardTitle>
              <CardDescription>
                The signals currently shaping the assistant&apos;s answers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Profile
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {profileSummary.industry || "Career Profile"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profileSummary.experience || 0} years experience
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profileSummary.skills?.length ? (
                    profileSummary.skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Add more skills in onboarding to sharpen the assistant.
                    </p>
                  )}
                </div>
              </div>

              {activeContextJob ? (
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Active Role
                  </p>
                  <p className="mt-2 text-lg font-semibold">{activeContextJob.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeContextJob.company}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeContextJob.matchScore ? (
                      <Badge variant="secondary">
                        Match {activeContextJob.matchScore}
                      </Badge>
                    ) : null}
                    {activeContextJob.atsScore ? (
                      <Badge variant="outline">
                        ATS {activeContextJob.atsScore}
                      </Badge>
                    ) : null}
                    {activeContextJob.status ? (
                      <Badge variant="outline">{activeContextJob.status}</Badge>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Tracker Snapshot
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {trackerSummary.total || 0} tracked roles
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">Applied {trackerSummary.applied || 0}</Badge>
                  <Badge variant="outline">
                    Interviewing {trackerSummary.interviewing || 0}
                  </Badge>
                  <Badge variant="outline">Offer {trackerSummary.offer || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xl">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-xl">Priority Roles</CardTitle>
              <CardDescription>
                Jump into a role-focused chat from your strongest saved jobs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {topSavedJobs.length > 0 ? (
                topSavedJobs.map((job) => (
                  <button
                    key={job.externalJobId}
                    type="button"
                    onClick={() =>
                      startDraftConversation("job-strategist", {
                        scopeType: "job",
                        companyName: job.company,
                        job,
                      })
                    }
                    className="w-full rounded-2xl border border-border/70 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{job.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {job.company}
                        </p>
                      </div>

                      <div className="min-w-[74px] text-right">
                        <p className="text-lg font-semibold">{job.matchScore || 0}</p>
                        <p className="text-xs text-muted-foreground">match</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save jobs first, then the assistant can rank and strategize them here.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xl">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-xl">Latest Interview Signal</CardTitle>
              <CardDescription>
                Your newest interview prep outcome also informs coaching.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {latestAssessment ? (
                <>
                  <div className="rounded-2xl border bg-background p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          Recent Score
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {latestAssessment.score}
                        </p>
                      </div>
                      <div className="flex-1">
                        <Progress value={latestAssessment.score} className="h-3" />
                        <p className="mt-3 text-sm text-muted-foreground">
                          {latestAssessment.tip || "No improvement tip saved yet."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => startDraftConversation("interview-coach", draftState)}
                    className="w-full"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Switch To Interview Coach
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete an interview quiz to unlock performance-aware coaching here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
