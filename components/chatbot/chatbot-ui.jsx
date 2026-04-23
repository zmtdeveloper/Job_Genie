"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Brain,
  FileText,
  GraduationCap,
  Loader2,
  PanelLeft,
  Plus,
  SendHorizontal,
  Sparkles,
  Target,
  Trash2,
  UserRound,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
    .replace(/^[-*\u2022]\s+/, "")
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

      if (lines.length > 0 && lines.every((line) => /^[-*\u2022]\s+/.test(line))) {
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
                "list-disc space-y-2 pl-5 text-sm leading-6 marker:text-muted-foreground sm:text-[15px] sm:leading-7",
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
                "list-decimal space-y-2 pl-5 text-sm leading-6 marker:text-muted-foreground sm:text-[15px] sm:leading-7",
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
            className={cn("text-sm leading-6 sm:text-[15px] sm:leading-7", textClassName)}
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
          "max-w-[94%] rounded-[18px] border px-3.5 py-3 shadow-none sm:max-w-3xl sm:rounded-[24px] sm:px-5 sm:py-4",
          isAssistant
            ? "jobs-glow-inner border-border/60 bg-[linear-gradient(180deg,rgba(16,27,43,0.96),rgba(13,22,36,0.94))] backdrop-blur"
            : "jobs-glow-active border-sky-300/18 bg-[linear-gradient(180deg,rgba(18,31,52,0.98),rgba(10,23,41,0.98))] text-white"
        )}
      >
        <div
          className={cn(
            "mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] sm:mb-3 sm:text-[11px] sm:tracking-[0.24em]",
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
  savedJobs,
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const [activeMode, setActiveMode] = useState(
    initialConversation?.mode || initialMode
  );
  const [draftState, setDraftState] = useState(draftContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const composerPlaceholder = activeContextJob
    ? `Ask about ${activeContextJob.title}, resume fit, or next steps...`
    : activeContextCompany
      ? `Ask about ${activeContextCompany}, interview prep, or job strategy...`
      : "Message Job_Genie about jobs, resume, ATS, or interviews...";
  const startDraftConversation = (nextMode, nextDraftContext = null) => {
    setActiveConversation(null);
    setActiveMode(nextMode);
    setDraftState(nextDraftContext);
    setInput("");
    setIsMobileMenuOpen(false);
    focusComposer();
  };

  const handleModeSwitch = (modeId) => {
    setIsMobileMenuOpen(false);
    startDraftConversation(modeId, currentScopedDraft);
  };

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    setActiveMode(conversation.mode);
    setDraftState(null);
    setIsMobileMenuOpen(false);
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
    <div className="relative h-full px-0 sm:px-4 md:px-1 xl:overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 hidden h-72 rounded-[36px] bg-[radial-gradient(circle_at_top,rgba(248,250,252,0.14),transparent_58%),linear-gradient(180deg,rgba(226,232,240,0.06),transparent_62%)] blur-3xl sm:block" />

      <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 [&>button]:right-3 [&>button]:top-3 sm:left-[50%] sm:top-[50%] sm:h-auto sm:w-[calc(100%-1rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:gap-4 sm:rounded-[24px] sm:border sm:border-border/70 sm:p-4 sm:[&>button]:right-4 sm:[&>button]:top-4 xl:hidden">
          <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(8,17,30,0.99),rgba(9,20,35,0.98)_52%,rgba(6,13,24,0.99))] sm:h-auto sm:bg-transparent">
            <div className="border-b border-white/8 px-4 pb-4 pt-5 sm:border-none sm:px-0 sm:pb-0 sm:pt-0">
              <p className="brand-kicker">Career Chat</p>
              <DialogTitle className="mt-2 text-2xl text-white sm:text-xl sm:gradient-title">
                Conversations
              </DialogTitle>
              <DialogDescription className="mt-1.5 max-w-sm text-sm leading-6">
                Switch modes, reopen chats, and jump into saved jobs from one mobile-first workspace.
              </DialogDescription>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  className="jobs-glow-button jobs-glow-button-primary h-11 flex-1 rounded-full px-4"
                  onClick={() =>
                    startDraftConversation(activeMode, currentScopedDraft)
                  }
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-0 sm:py-0">
              <div className="space-y-5">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="brand-kicker">Chat Modes</p>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      {CHAT_MODES.length} modes
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
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
                            "group flex min-h-[104px] flex-col items-start justify-between rounded-[22px] border px-3.5 py-3 text-left transition-all",
                            isSelectedMode
                              ? "jobs-glow-active border-white/18 text-white shadow-none"
                              : "jobs-glow-inner border-border/70 bg-background/60 text-foreground/88 shadow-none"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-[16px] border transition-colors",
                              isSelectedMode
                                ? "border-white/20 bg-white/10 text-white"
                                : "jobs-glow-button border-border/70 bg-background/60 text-foreground/88"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

                          <div>
                            <span className="text-sm font-semibold leading-tight">
                              {mode.label}
                            </span>
                            <p
                              className={cn(
                                "mt-1 line-clamp-2 text-xs leading-5",
                                isSelectedMode
                                  ? "text-white/68"
                                  : "text-muted-foreground"
                              )}
                            >
                              {mode.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="brand-kicker mb-3">Recent Chats</p>
                  {conversationGroups.length > 0 ? (
                    <div className="space-y-3">
                      {conversationGroups.map((section) => (
                        <div key={section.label}>
                          <p className="px-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                            {section.label}
                          </p>
                          <div className="mt-2 space-y-2">
                            {section.items.map((conversation) => {
                              const isActive =
                                getConversationKey(activeConversation) ===
                                conversation.id;
                              const conversationMeta = [
                                findMode(conversation.mode).label,
                                formatRelativeTime(
                                  conversation.lastMessageAt || conversation.updatedAt
                                ),
                              ]
                                .filter(Boolean)
                                .join(" - ");

                              return (
                                <div
                                  key={conversation.id}
                                  className={cn(
                                    "rounded-[20px] border px-3.5 py-3 transition-all",
                                    isActive
                                      ? "jobs-glow-active border-white/18 text-white shadow-none"
                                      : "jobs-glow-inner border-border/70 bg-background/60 shadow-none"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSelectConversation(conversation)
                                      }
                                      className="min-w-0 flex-1 text-left"
                                    >
                                      <p className="line-clamp-2 text-sm font-semibold leading-6">
                                        {conversation.title}
                                      </p>
                                      <p
                                        className={cn(
                                          "mt-1 text-xs",
                                          isActive
                                            ? "text-white/65"
                                            : "text-muted-foreground"
                                        )}
                                      >
                                        {conversationMeta}
                                      </p>
                                    </button>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleDeleteConversation(conversation.id)
                                      }
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
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="jobs-glow-inner rounded-[20px] border border-dashed border-border/70 bg-background/60 px-4 py-4 text-sm text-muted-foreground shadow-none">
                      No chats yet. Start a new one and it will appear here.
                    </div>
                  )}
                </div>

                <div>
                  <p className="brand-kicker mb-3">Saved Jobs</p>
                  {savedJobs.length > 0 ? (
                    <div className="space-y-2">
                      {savedJobs.map((job) => (
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
                          className="jobs-glow-inner w-full rounded-[20px] border border-border/70 bg-background/80 p-3.5 text-left shadow-none"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="line-clamp-2 font-semibold">
                                {job.title}
                              </p>
                              <p className="mt-1 truncate text-sm text-muted-foreground">
                                {job.company}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-base font-semibold">
                                {job.matchScore || 0}
                              </p>
                              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                                match
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="jobs-glow-inner rounded-[20px] border border-dashed border-border/70 bg-background/60 px-4 py-4 text-sm text-muted-foreground shadow-none">
                      Save jobs first and they will show up here for faster chats.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-0 sm:gap-3 xl:h-full xl:min-h-0 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="order-2 hidden min-h-[320px] flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card/90 shadow-none backdrop-blur xl:order-1 xl:flex xl:min-h-0 xl:h-full">
          <div className="border-b border-border/60 p-3.5">
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

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
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
                      "group flex min-h-[88px] flex-col items-start justify-between rounded-[20px] border px-3.5 py-3 text-left transition-all",
                      isSelectedMode
                        ? "jobs-glow-active border-white/18 text-white shadow-none"
                        : "jobs-glow-inner border-border/70 bg-background/60 text-foreground/88 shadow-none hover:-translate-y-0.5 hover:border-white/15 hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-[16px] border transition-colors",
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

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3.5">
            <h2 className="px-2 text-lg font-semibold sm:text-xl">Recent Chats</h2>

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
                          .join(" - ");

                        return (
                          <div
                            key={conversation.id}
                            className={cn(
                              "rounded-[18px] border px-3.5 py-3 transition-all",
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

        <section className="order-1 jobs-glow-panel flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-none border-x-0 border-b-0 border-t border-border/60 bg-card/90 shadow-none backdrop-blur sm:min-h-[500px] sm:rounded-[24px] sm:border sm:border-border/70 xl:order-2 xl:min-h-0 xl:h-full">
          <div className="sticky top-0 z-20 border-b border-white/8 bg-[#08111d]/96 px-3 pb-3 pt-3 backdrop-blur-2xl sm:hidden">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="jobs-glow-button h-10 rounded-full px-3"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <PanelLeft className="h-4 w-4" />
                Menu
              </Button>

              <Button
                type="button"
                className="jobs-glow-button jobs-glow-button-primary h-10 rounded-full px-3.5"
                onClick={() =>
                  startDraftConversation(activeMode, currentScopedDraft)
                }
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              <Badge
                variant="outline"
                className="jobs-glow-button w-fit rounded-full border-border/70 bg-background/60 px-2.5 py-0.5 text-[11px] shadow-none"
              >
                {activeModeConfig.label}
              </Badge>

              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  AI Career Chat
                </p>
                <h2 className="mt-1 text-lg font-semibold leading-tight text-white">
                  {panelTitle}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {activeModeConfig.description}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden jobs-glow-inner relative mx-2 mt-2 overflow-hidden rounded-[22px] border border-border/70 bg-card/80 px-3.5 pb-3 pt-3.5 md:mx-3 md:mt-3 md:px-5 sm:block">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <Badge
                    variant="outline"
                    className="jobs-glow-button w-fit rounded-full border-border/70 bg-background/60 px-2.5 py-0.5 shadow-none"
                  >
                    AI Career Chat
                  </Badge>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-[1.85rem]">
                      {panelTitle}
                    </h2>
                    <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                      {panelDescription}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 xl:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="jobs-glow-button rounded-full px-3"
                    onClick={() => setIsMobileMenuOpen(true)}
                  >
                    <PanelLeft className="h-4 w-4" />
                    Menu
                  </Button>
                  <Button
                    type="button"
                    className="jobs-glow-button jobs-glow-button-primary rounded-full px-3"
                    onClick={() =>
                      startDraftConversation(activeMode, currentScopedDraft)
                    }
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                </div>
              </div>
            </div>

            {activeContextJob ? (
              <div className="jobs-glow-inner mt-3 rounded-[20px] border border-border/70 bg-background/70 p-3 shadow-none">
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
              <div className="jobs-glow-inner mt-3 rounded-[20px] border border-border/70 bg-background/70 p-3 shadow-none">
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

          {activeContextJob ? (
            <div className="border-b border-white/8 bg-[#0a1321]/94 px-3 py-2.5 sm:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    Role Context
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">
                    {activeContextJob.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {activeContextJob.company}
                    {activeContextJob.location ? ` - ${activeContextJob.location}` : ""}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleClearContext()}
                  disabled={isClearingActiveContext}
                  className="jobs-glow-button h-8 rounded-full px-3 text-xs text-white/80 shadow-none"
                >
                  Clear
                </Button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {activeContextJob.matchScore != null ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-border/70 bg-background/70"
                  >
                    Match {activeContextJob.matchScore}
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
              </div>
            </div>
          ) : activeContextCompany ? (
            <div className="border-b border-white/8 bg-[#0a1321]/94 px-3 py-2.5 sm:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    Company Context
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">
                    {activeContextCompany}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleClearContext()}
                  disabled={isClearingActiveContext}
                  className="jobs-glow-button h-8 rounded-full px-3 text-xs text-white/80 shadow-none"
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col pt-0 sm:pt-1">
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3 sm:px-3 sm:py-4 md:px-5">
              <div className="mx-auto w-full max-w-3xl space-y-4">
                {showPromptCards ? (
                  <div className="space-y-3 sm:hidden">
                    <div className="px-1 pt-1">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                        {activeModeConfig.label}
                      </p>
                      <h3 className="mt-2 text-[1.2rem] font-semibold leading-tight text-white">
                        Let&apos;s work on your next move
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {panelDescription}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      {suggestedPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleQuickPrompt(prompt)}
                          className="jobs-glow-inner rounded-[20px] border border-border/70 bg-background/80 px-3.5 py-3 text-left text-[13px] font-semibold leading-5 text-foreground/95 shadow-none transition-all active:scale-[0.99]"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

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
                    <div className="jobs-glow-inner rounded-[18px] border border-border/70 bg-card/80 px-3.5 py-3 text-sm text-muted-foreground sm:rounded-[20px]">
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

            <div className="bg-[linear-gradient(180deg,rgba(7,17,29,0)_0%,rgba(7,17,29,0.82)_22%,rgba(7,17,29,0.98)_44%)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2.5 backdrop-blur-2xl sm:border-t sm:border-border/60 sm:bg-background/95 sm:px-5 sm:py-2.5">
              <div className="mx-auto w-full max-w-3xl">
                {showPromptCards ? (
                  <div className="mb-2 hidden -translate-y-1 justify-center sm:flex">
                    <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:grid sm:max-w-3xl sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                      {suggestedPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleQuickPrompt(prompt)}
                          className="jobs-glow-inner min-h-[58px] min-w-[220px] rounded-[20px] border border-border/70 bg-background/80 px-3 py-2.5 text-left text-[12px] font-semibold leading-5 text-foreground/95 shadow-none transition-all hover:-translate-y-0.5 hover:border-white/15 hover:text-white sm:min-h-[64px] sm:min-w-0 sm:text-[13px]"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="jobs-glow-inner relative rounded-[22px] border border-white/10 bg-[#0a1423]/96 px-3 py-2 shadow-none sm:-translate-y-1 sm:rounded-[24px] sm:border-border/70 sm:bg-[#0b1626]/92">
                  {activeContextJob ? (
                    <div className="mb-2 hidden flex-wrap gap-2 sm:flex">
                      <Badge
                        variant="secondary"
                        className="rounded-full border border-border/70 bg-background/70"
                      >
                        Talking about {activeContextJob.title}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-full border-border/70 bg-background/50"
                      >
                        {activeContextJob.company}
                      </Badge>
                    </div>
                  ) : activeContextCompany ? (
                    <div className="mb-2 hidden flex-wrap gap-2 sm:flex">
                      <Badge
                        variant="secondary"
                        className="rounded-full border border-border/70 bg-background/70"
                      >
                        Company context: {activeContextCompany}
                      </Badge>
                    </div>
                  ) : null}

                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={textareaRef}
                      rows={1}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={composerPlaceholder}
                      className="min-h-[40px] flex-1 resize-none border-0 bg-transparent px-0 py-[8px] text-[15px] leading-6 placeholder:font-medium placeholder:text-muted-foreground/90 shadow-none focus-visible:ring-0 sm:min-h-[42px]"
                    />

                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        !input.trim() ||
                        sendingMessage ||
                        isActionLoading ||
                        isDeletingActiveConversation
                      }
                      className="jobs-glow-button jobs-glow-button-primary h-10 w-10 shrink-0 rounded-full p-0 shadow-none sm:w-auto sm:px-3.5"
                    >
                      <SendHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">Send</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="order-3 hidden xl:block xl:min-h-0 xl:h-full">
          <div className="h-full overflow-y-auto">
            <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-background/70 p-3.5 shadow-none">
              <div className="flex items-center gap-3">
                <div className="jobs-glow-inner rounded-[20px] border border-border/70 bg-background p-2.5 shadow-none">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold">Saved Jobs</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {savedJobs.length > 0 ? (
                  savedJobs.map((job) => (
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
                      className="jobs-glow-inner w-full rounded-[20px] border border-border/70 bg-background/80 p-3.5 text-left shadow-none transition-all hover:-translate-y-0.5 hover:border-white/15"
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
