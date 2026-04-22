"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Brain,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  SendHorizontal,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  clearConversationContext,
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

function isSameCalendarDay(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function getConversationGroupLabel(value) {
  if (!value) {
    return "Older";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Older";
  }

  const now = new Date();

  if (isSameCalendarDay(date, now)) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameCalendarDay(date, yesterday)) {
    return "Yesterday";
  }

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const diffInDays = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / 86400000
  );

  if (diffInDays < 7) {
    return "This Week";
  }

  return "Older";
}

function groupConversationsByDate(conversations) {
  const sectionOrder = ["Today", "Yesterday", "This Week", "Older"];
  const sections = new Map(sectionOrder.map((label) => [label, []]));

  conversations.forEach((conversation) => {
    const label = getConversationGroupLabel(
      conversation.lastMessageAt || conversation.updatedAt
    );
    sections.get(label).push(conversation);
  });

  return sectionOrder
    .map((label) => ({
      label,
      items: sections.get(label),
    }))
    .filter((section) => section.items.length > 0);
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
  return conversations.filter(
    (conversation) => conversation.id !== conversationId
  );
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

function clearConversationContextState(conversation) {
  if (!conversation) {
    return conversation;
  }

  return {
    ...conversation,
    scopeType: "general",
    companyName: "",
    contextJob: null,
  };
}

function clearConversationCollection(conversations, conversationId) {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? clearConversationContextState(conversation)
      : conversation
  );
}

function findMode(modeId) {
  return CHAT_MODES.find((mode) => mode.id === modeId) || CHAT_MODES[0];
}

function buildScopedDraftContext(activeContextJob, activeContextCompany, scopeType) {
  if (activeContextJob) {
    return {
      scopeType: "job",
      companyName: activeContextJob.company,
      job: activeContextJob,
      draftPrompt: "",
    };
  }

  if (activeContextCompany) {
    return {
      scopeType: scopeType && scopeType !== "general" ? scopeType : "company",
      companyName: activeContextCompany,
      job: null,
      draftPrompt: "",
    };
  }

  return null;
}

function normalizeMessageText(content) {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`{1,3}([^`]+?)`{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripListMarker(line) {
  return line
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function parseMessageBlocks(content) {
  const normalizedContent = normalizeMessageText(content);

  if (!normalizedContent) {
    return [];
  }

  return normalizedContent
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length > 0 && lines.every((line) => /^[-*•]\s+/.test(line))) {
        return {
          type: "unordered-list",
          items: lines.map(stripListMarker),
        };
      }

      if (lines.length > 0 && lines.every((line) => /^\d+[.)]\s+/.test(line))) {
        return {
          type: "ordered-list",
          items: lines.map(stripListMarker),
        };
      }

      return {
        type: "paragraph",
        lines,
      };
    });
}

function MessageContent({ content, isAssistant }) {
  const blocks = useMemo(() => parseMessageBlocks(content), [content]);
  const textClassName = isAssistant ? "text-foreground/90" : "text-white/90";

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "unordered-list") {
          return (
            <ul
              key={`ul-${blockIndex}`}
              className={cn(
                "list-disc space-y-2 pl-5 text-[15px] leading-7 marker:text-muted-foreground",
                textClassName
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ul-item-${blockIndex}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol
              key={`ol-${blockIndex}`}
              className={cn(
                "list-decimal space-y-2 pl-5 text-[15px] leading-7 marker:text-muted-foreground",
                textClassName
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ol-item-${blockIndex}-${itemIndex}`}>{item}</li>
              ))}
            </ol>
          );
        }

        return (
          <p
            key={`p-${blockIndex}`}
            className={cn("text-[15px] leading-7", textClassName)}
          >
            {block.lines.map((line, lineIndex) => (
              <span key={`line-${blockIndex}-${lineIndex}`}>
                {line}
                {lineIndex < block.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function MessageBubble({ message, onAction }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("flex w-full", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-3xl rounded-[24px] border px-5 py-4 shadow-none",
          isAssistant
            ? "jobs-glow-inner border-border/70 bg-card/90 backdrop-blur"
            : "jobs-glow-active border-white/15 bg-slate-950/95 text-white"
        )}
      >
        <div
          className={cn(
            "mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em]",
            isAssistant ? "text-muted-foreground" : "text-white/70"
          )}
        >
          {isAssistant ? (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Job_Genie
            </>
          ) : (
            <>
              <UserRound className="h-3.5 w-3.5" />
              You
            </>
          )}
          {message.createdAt ? (
            <span className="ml-1 text-[10px] normal-case tracking-normal opacity-80">
              {formatRelativeTime(message.createdAt)}
            </span>
          ) : null}
        </div>

        <MessageContent content={message.content} isAssistant={isAssistant} />

        {isAssistant &&
        Array.isArray(message.actions) &&
        message.actions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.actions.map((action, index) =>
              action.href ? (
                <Button
                  key={`${action.type}-${index}`}
                  size="sm"
                  variant="outline"
                  className="jobs-glow-button rounded-full shadow-none"
                  asChild
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ) : (
                <Button
                  key={`${action.type}-${index}`}
                  size="sm"
                  variant="outline"
                  className="jobs-glow-button rounded-full shadow-none"
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
  topSavedJobs,
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const [activeMode, setActiveMode] = useState(
    initialConversation?.mode || initialMode
  );
  const [draftState, setDraftState] = useState(draftContext);
  const [input, setInput] = useState("");
  const messageEndRef = useRef(null);
  const textareaRef = useRef(null);

  const { loading: sendingMessage, fn: sendMessageFn } = useFetch(sendChatMessage);
  const { loading: deletingConversation, fn: deleteConversationFn } =
    useFetch(deleteChatConversation);
  const { loading: clearingContext, fn: clearConversationContextFn } =
    useFetch(clearConversationContext);
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
  const isClearingActiveContext =
    clearingContext && Boolean(activeContextJob || activeContextCompany);
  const composerMinHeight = 37;
  const composerMaxHeight = 137;

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, sendingMessage]);

  useEffect(() => {
    const textareaElement = textareaRef.current;

    if (!textareaElement) {
      return;
    }

    textareaElement.style.height = "0px";
    const nextHeight = Math.min(
      Math.max(textareaElement.scrollHeight, composerMinHeight),
      composerMaxHeight
    );

    textareaElement.style.height = `${nextHeight}px`;
    textareaElement.style.overflowY =
      textareaElement.scrollHeight > composerMaxHeight ? "auto" : "hidden";
  }, [composerMaxHeight, composerMinHeight, input]);

  const focusComposer = () => {
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const currentScopedDraft = useMemo(
    () =>
      buildScopedDraftContext(
        activeContextJob,
        activeContextCompany,
        activeConversation?.scopeType || draftState?.scopeType || "general"
      ),
    [
      activeContextCompany,
      activeContextJob,
      activeConversation?.scopeType,
      draftState?.scopeType,
    ]
  );

  const conversationGroups = useMemo(
    () => groupConversationsByDate(sortConversations(conversations)),
    [conversations]
  );

  const suggestedPrompts = useMemo(() => {
    const prompts = [...activeModeConfig.emptyPrompts];

    if (activeContextJob?.title) {
      prompts.unshift(
        `What is missing from my resume for ${activeContextJob.title}?`,
        `Write a short cover letter angle for ${activeContextJob.company}.`,
        `What interview questions should I expect for ${activeContextJob.title}?`
      );
    } else if (activeContextCompany) {
      prompts.unshift(`How should I position myself for ${activeContextCompany}?`);
    }

    return [...new Set(prompts)].slice(0, 3);
  }, [activeContextCompany, activeContextJob, activeModeConfig.emptyPrompts]);

  const panelTitle =
    activeConversation?.title || `New ${activeModeConfig.label} chat`;
  const panelDescription = activeConversation
    ? `${activeMessages.length} ${
        activeMessages.length === 1 ? "message" : "messages"
      } in this memory-backed session.`
    : activeContextJob
      ? `Focused on ${activeContextJob.title} at ${activeContextJob.company}. Ask directly and take action from the reply.`
      : activeContextCompany
        ? `Company context is loaded for ${activeContextCompany}.`
        : "Start a focused conversation. Your profile, resume, tracker, and saved jobs are already in context.";
  const showPromptCards =
    activeMessages.length === 0 && !sendingMessage && !input.trim();
  const startDraftConversation = (nextMode, nextDraftContext = null) => {
    setActiveConversation(null);
    setActiveMode(nextMode);
    setDraftState(nextDraftContext);
    setInput("");
    focusComposer();
  };

  const handleModeSwitch = (modeId) => {
    startDraftConversation(modeId, currentScopedDraft);
  };

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    setActiveMode(conversation.mode);
    setDraftState(null);
    focusComposer();
  };

  const handleSendMessage = async () => {
    const normalizedInput = input.trim();

    if (!normalizedInput || sendingMessage) {
      return;
    }

    let response = null;

    try {
      response = await sendMessageFn({
        conversationId: activeConversation?.id,
        mode: activeConversation?.mode || activeMode,
        message: normalizedInput,
        draftContext: activeConversation ? null : draftState,
      });
    } catch (error) {
      console.error("Send message error:", error);
      return;
    }

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
    focusComposer();
  };

  const handleClearContext = async () => {
    if (activeConversation?.id) {
      let response = null;

      try {
        response = await clearConversationContextFn({
          conversationId: activeConversation.id,
        });
      } catch (error) {
        console.error("Clear conversation context error:", error);
        return;
      }

      if (!response?.conversationId) {
        return;
      }

      setActiveConversation((currentConversation) =>
        clearConversationContextState(currentConversation)
      );
      setConversations((currentConversations) =>
        clearConversationCollection(currentConversations, response.conversationId)
      );
      toast.success("Role context removed");
      return;
    }

    setDraftState(null);
    router.replace("/career-chat");
    toast.success("Role context removed");
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

    let response = null;

    try {
      response = await deleteConversationFn({ conversationId });
    } catch (error) {
      console.error("Delete conversation error:", error);
      return;
    }

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
      let savedJob = null;

      try {
        savedJob = await saveJobFn(job);
      } catch (error) {
        console.error("Save job from chat error:", error);
        return;
      }

      if (savedJob) {
        const nextJobState = {
          ...savedJob,
          isSaved: true,
        };
        if (activeConversation?.id) {
          try {
            await syncConversationJobStateFn({
              conversationId: activeConversation.id,
              job: nextJobState,
            });
          } catch (error) {
            console.error("Sync conversation job state error:", error);
          }
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
      let result = null;

      try {
        result = job.isSaved
          ? await updateSavedJobFn({
              externalJobId: job.externalJobId,
              provider: job.provider,
              status: "applied",
            })
          : await saveJobFn({
              ...job,
              status: "applied",
            });
      } catch (error) {
        console.error("Move job to applied error:", error);
        return;
      }

      if (result) {
        const nextJobState = {
          ...result,
          isSaved: true,
          status: "applied",
        };
        if (activeConversation?.id) {
          try {
            await syncConversationJobStateFn({
              conversationId: activeConversation.id,
              job: nextJobState,
            });
          } catch (error) {
            console.error("Sync conversation job state error:", error);
          }
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

      let result = null;

      try {
        result = job.isSaved
          ? await updateSavedJobFn({
              externalJobId: job.externalJobId,
              provider: job.provider,
              notes: note,
            })
          : await saveJobFn({
              ...job,
              notes: note,
            });
      } catch (error) {
        console.error("Add tracker note error:", error);
        return;
      }

      if (result) {
        const nextJobState = {
          ...result,
          isSaved: true,
          notes: result.notes || note,
        };
        if (activeConversation?.id) {
          try {
            await syncConversationJobStateFn({
              conversationId: activeConversation.id,
              job: nextJobState,
            });
          } catch (error) {
            console.error("Sync conversation job state error:", error);
          }
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

  const handleComposerKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <div className="relative h-full px-4 md:px-1 lg:overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 rounded-[36px] bg-[radial-gradient(circle_at_top,rgba(248,250,252,0.14),transparent_58%),linear-gradient(180deg,rgba(226,232,240,0.06),transparent_62%)] blur-3xl" />

      <div
        className="grid gap-4 lg:h-full lg:min-h-0 xl:grid-cols-[300px_minmax(0,1fr)_320px]"
      >
        <aside className="jobs-glow-panel flex min-h-[360px] flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card/90 shadow-none backdrop-blur xl:min-h-0 xl:h-full">
          <div className="border-b border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="pl-2 text-xl font-semibold">Chat Modes</h2>
              </div>

              <Button
                type="button"
                size="icon"
                className="jobs-glow-button jobs-glow-button-primary h-10 w-10 rounded-full shadow-none"
                onClick={() => startDraftConversation(activeMode, currentScopedDraft)}
                aria-label="Start new chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {CHAT_MODES.map((mode) => {
                const Icon = MODE_ICONS[mode.id] || Sparkles;
                const isSelectedMode =
                  (activeConversation?.mode || activeMode) === mode.id;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleModeSwitch(mode.id)}
                    className={cn(
                      "group flex min-h-[104px] flex-col items-start justify-between rounded-[24px] border px-4 py-3.5 text-left transition-all",
                      isSelectedMode
                        ? "jobs-glow-active border-white/18 text-white shadow-none"
                        : "jobs-glow-inner border-border/70 bg-background/60 text-foreground/88 shadow-none hover:-translate-y-0.5 hover:border-white/15 hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-[18px] border transition-colors",
                        isSelectedMode
                          ? "border-white/20 bg-white/10 text-white"
                          : "jobs-glow-button border-border/70 bg-background/60 text-foreground/88 group-hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[15px] font-semibold leading-tight">
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <h2 className="px-2 text-xl font-semibold">Recent Chats</h2>

            {conversationGroups.length > 0 ? (
              <div className="mt-4">
                {conversationGroups.map((section) => (
                  <div key={section.label} className="mb-5 last:mb-0">
                    <p className="px-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      {section.label}
                    </p>

                    <div className="mt-3 space-y-3">
                      {section.items.map((conversation) => {
                        const isActive =
                          getConversationKey(activeConversation) === conversation.id;
                        const conversationMeta = [
                          findMode(conversation.mode).label,
                          conversation.scopeType !== "general"
                            ? conversation.scopeType
                            : null,
                          formatRelativeTime(
                            conversation.lastMessageAt || conversation.updatedAt
                          ),
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <div
                            key={conversation.id}
                            className={cn(
                              "rounded-[20px] border px-4 py-3 transition-all",
                              isActive
                                ? "jobs-glow-active border-white/18 bg-slate-950/95 text-white shadow-none"
                                : "jobs-glow-inner border-border/70 bg-background/60 shadow-none hover:border-white/15"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => handleSelectConversation(conversation)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="line-clamp-2 text-sm font-semibold leading-6">
                                  {conversation.title}
                                </p>
                                <p
                                  className={cn(
                                    "mt-1 text-xs",
                                    isActive ? "text-white/65" : "text-muted-foreground"
                                  )}
                                >
                                  {conversationMeta}
                                </p>
                              </button>

                              <div className="pt-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteConversation(conversation.id)}
                                  disabled={deletingConversation}
                                  className={cn(
                                    "jobs-glow-button h-8 w-8 rounded-full shadow-none",
                                    isActive
                                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                                      : "text-muted-foreground hover:text-destructive"
                                  )}
                                  aria-label={`Delete ${conversation.title}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="jobs-glow-inner mt-4 rounded-[20px] border border-dashed border-border/70 bg-background/60 px-4 py-5 text-sm leading-6 text-muted-foreground shadow-none">
                No conversations yet. Start a new chat and your saved sessions
                will show up here.
              </div>
            )}
          </div>
        </aside>

        <section className="jobs-glow-panel flex min-h-[520px] flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card/90 shadow-none backdrop-blur xl:min-h-0 xl:h-full">
          <div className="jobs-glow-inner relative mx-3 mt-3 overflow-hidden rounded-[24px] border border-border/70 bg-card/80 px-4 pb-3 pt-4 md:px-6">
            <div className="flex flex-col gap-2">
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="jobs-glow-button w-fit rounded-full border-border/70 bg-background/60 px-2.5 py-0.5 shadow-none"
                >
                  Job Genie&apos;s advanced personalized chatbot
                </Badge>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem]">
                    {panelTitle}
                  </h2>
                  <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                    {panelDescription}
                  </p>
                </div>
              </div>
            </div>

            {activeContextJob ? (
              <div className="jobs-glow-inner mt-3 rounded-[24px] border border-border/70 bg-background/70 p-3.5 shadow-none">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      Active role context
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeContextJob.matchScore != null ? (
                        <Badge
                          variant="secondary"
                          className="border border-border/70 bg-background/70"
                        >
                          Match {activeContextJob.matchScore}
                        </Badge>
                      ) : null}
                      {activeContextJob.atsScore != null ? (
                        <Badge
                          variant="outline"
                          className="border-border/70 bg-background/40"
                        >
                          ATS {activeContextJob.atsScore}
                        </Badge>
                      ) : null}
                      {activeContextJob.status ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-border/70 bg-background/50"
                        >
                          {activeContextJob.status}
                        </Badge>
                      ) : null}
                      <Badge
                        variant="outline"
                        className="jobs-glow-button cursor-pointer rounded-full border-border/70 bg-background/50 text-foreground/88 shadow-none transition-colors hover:border-white/15 hover:bg-background/70 hover:text-white"
                        asChild
                      >
                        <button
                          type="button"
                          onClick={() => void handleClearContext()}
                          disabled={isClearingActiveContext}
                          className="inline-flex items-center gap-1.5"
                        >
                          Remove context
                        </button>
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {activeContextJob.title}
                    </span>
                    <span>at {activeContextJob.company}</span>
                    {activeContextJob.location ? (
                      <span>{activeContextJob.location}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : activeContextCompany ? (
              <div className="jobs-glow-inner mt-3 rounded-[24px] border border-border/70 bg-background/70 p-3.5 shadow-none">
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      Active company context
                    </p>
                    <Badge
                      variant="outline"
                      className="jobs-glow-button cursor-pointer rounded-full border-border/70 bg-background/50 text-foreground/88 shadow-none transition-colors hover:border-white/15 hover:bg-background/70 hover:text-white"
                      asChild
                    >
                      <button
                        type="button"
                        onClick={() => void handleClearContext()}
                        disabled={isClearingActiveContext}
                        className="inline-flex items-center gap-1.5"
                      >
                        Remove context
                      </button>
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeContextCompany}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col pt-1">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
              <div className="space-y-4">
                {activeMessages.length > 0 ? (
                  activeMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onAction={handleChatAction}
                    />
                  ))
                ) : null}

                {sendingMessage ? (
                  <div className="flex justify-start">
                    <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Job_Genie is shaping a response...
                      </div>
                    </div>
                  </div>
                ) : null}

                <div ref={messageEndRef} />
              </div>
            </div>

            <div className="border-t border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur md:px-6">
              {showPromptCards ? (
                <div className="mb-2 -translate-y-1 flex justify-center">
                  <div className="grid w-full max-w-3xl gap-2 md:grid-cols-3">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleQuickPrompt(prompt)}
                        className="jobs-glow-inner min-h-[66px] rounded-[24px] border border-border/70 bg-background/80 px-3.5 py-2.5 text-left text-[13px] font-semibold leading-5 text-foreground/95 shadow-none transition-all hover:-translate-y-0.5 hover:border-white/15 hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="jobs-glow-inner relative -translate-y-1 rounded-[24px] border border-border/70 bg-background/80 px-2.5 py-1.5 shadow-none">
                {activeContextJob ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full border border-border/70 bg-background/70">
                      Talking about {activeContextJob.title}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-border/70 bg-background/50">
                      {activeContextJob.company}
                    </Badge>
                  </div>
                ) : activeContextCompany ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full border border-border/70 bg-background/70">
                      Company context: {activeContextCompany}
                    </Badge>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <Textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Ask about resume gaps, saved jobs, ATS fit, cover letters, or interview prep..."
                    className="min-h-0 flex-1 resize-none border-0 bg-transparent py-[6px] text-sm leading-5 placeholder:font-medium placeholder:text-muted-foreground/90 shadow-none focus-visible:ring-0"
                  />

                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      !input.trim() ||
                      sendingMessage ||
                      isActionLoading ||
                      isDeletingActiveConversation
                    }
                    className="jobs-glow-button jobs-glow-button-primary h-9 shrink-0 rounded-full px-4 shadow-none"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="min-h-[320px] xl:min-h-0 xl:h-full">
          <div className="h-full overflow-y-auto">
              <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-background/70 p-4 shadow-none">
                <div className="flex items-center gap-3">
                  <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-background p-3 shadow-none">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">Saved JOBs</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
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
                            draftPrompt: "",
                          })
                        }
                        className="jobs-glow-inner w-full rounded-[24px] border border-border/70 bg-background/80 p-4 text-left shadow-none transition-all hover:-translate-y-0.5 hover:border-white/15"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{job.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {job.company}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              {job.matchScore || 0}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                              match
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Save jobs first and they will show up here for faster
                      strategy chats.
                    </p>
                  )}
                </div>
              </div>

          </div>
        </aside>
      </div>
    </div>
  );
}
