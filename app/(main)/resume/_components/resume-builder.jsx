"use client";

import { useState, useEffect, useDeferredValue, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume } from "@/actions/resume";
import { EntryForm } from "./entry-form";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";
import html2pdf from "html2pdf.js/dist/html2pdf.min.js";

const EMPTY_RESUME_FORM = {
  contactInfo: {
    email: "",
    mobile: "",
    linkedin: "",
    twitter: "",
  },
  summary: "",
  skills: "",
  experience: [],
  education: [],
  projects: [],
};

function normalizeResumeText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function normalizeResumeMarkdownForCompare(value) {
  return normalizeResumeText(value)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSectionContent(content, sectionTitle) {
  const expression = new RegExp(
    `## ${escapeRegExp(sectionTitle)}\\n\\n([\\s\\S]*?)(?=\\n## |$)`,
    "i"
  );
  const match = normalizeResumeText(content).match(expression);
  return match?.[1]?.trim() || "";
}

function parseResumeEntries(sectionContent) {
  if (!sectionContent) {
    return [];
  }

  const entries = [];
  const matcher =
    /^###\s+(.+?)\s+@\s+(.+?)\n(.+?)\n\n([\s\S]*?)(?=^###\s+|$)/gm;
  let match;

  while ((match = matcher.exec(`${sectionContent}\n`)) !== null) {
    const [, title, organization, dateRange, description] = match;
    const dateParts = String(dateRange || "").split(" - ");
    const startDate = String(dateParts[0] || "").trim();
    const endDateLabel = String(dateParts[1] || "").trim();
    const current = /present/i.test(endDateLabel);

    entries.push({
      title: String(title || "").trim(),
      organization: String(organization || "").trim(),
      startDate,
      endDate: current ? "" : endDateLabel,
      description: String(description || "").trim(),
      current,
    });
  }

  return entries;
}

function parseResumeMarkdown(content) {
  const normalizedContent = normalizeResumeText(content);

  if (!normalizedContent) {
    return {
      values: EMPTY_RESUME_FORM,
      canHydrate: true,
    };
  }

  const contactInfo = {
    email:
      normalizedContent.match(/&#128231;\s*([^|\n<]+)/)?.[1]?.trim() || "",
    mobile:
      normalizedContent.match(/&#128241;\s*([^|\n<]+)/)?.[1]?.trim() || "",
    linkedin:
      normalizedContent.match(/\[LinkedIn\]\(([^)]+)\)/)?.[1]?.trim() || "",
    twitter:
      normalizedContent.match(/\[Twitter\]\(([^)]+)\)/)?.[1]?.trim() || "",
  };

  const values = {
    contactInfo,
    summary: extractSectionContent(normalizedContent, "Professional Summary"),
    skills: extractSectionContent(normalizedContent, "Skills"),
    experience: parseResumeEntries(
      extractSectionContent(normalizedContent, "Work Experience")
    ),
    education: parseResumeEntries(
      extractSectionContent(normalizedContent, "Education")
    ),
    projects: parseResumeEntries(
      extractSectionContent(normalizedContent, "Projects")
    ),
  };

  const hasHydratedValues = Boolean(
    values.summary ||
      values.skills ||
      values.experience.length ||
      values.education.length ||
      values.projects.length ||
      Object.values(values.contactInfo).some(Boolean)
  );

  return {
    values: hasHydratedValues ? values : EMPTY_RESUME_FORM,
    canHydrate: hasHydratedValues,
  };
}

export default function ResumeBuilder({ initialContent }) {
  const parsedInitialResume = useMemo(
    () => parseResumeMarkdown(initialContent),
    [initialContent]
  );
  const [activeTab, setActiveTab] = useState(
    initialContent ? "preview" : "edit"
  );
  const [previewContent, setPreviewContent] = useState(initialContent || "");
  const [syncedPreviewContent, setSyncedPreviewContent] = useState(
    initialContent || ""
  );
  const isFormHydratedFromMarkdown =
    parsedInitialResume.canHydrate || !initialContent;
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");

  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: EMPTY_RESUME_FORM,
  });

  const {
    loading: isSaving,
    fn: saveResumeFn,
  } = useFetch(saveResume);

  const deferredFormValues = useDeferredValue(useWatch({ control }));
  const {
    contactInfo = {},
    summary,
    skills,
    experience,
    education,
    projects,
  } = deferredFormValues ?? {};

  const normalizedParts = [];
  if (contactInfo.email) {
    normalizedParts.push(`&#128231; ${contactInfo.email}`);
  }
  if (contactInfo.mobile) {
    normalizedParts.push(`&#128241; ${contactInfo.mobile}`);
  }
  if (contactInfo.linkedin) {
    normalizedParts.push(`&#128188; [LinkedIn](${contactInfo.linkedin})`);
  }
  if (contactInfo.twitter) {
    normalizedParts.push(`&#128038; [Twitter](${contactInfo.twitter})`);
  }

  const contactMarkdown =
    normalizedParts.length > 0
      ? `## <div align="center">${user?.fullName ?? ""}</div>\n\n<div align="center">\n\n${normalizedParts.join(
          " | "
        )}\n\n</div>`
      : "";

  const generatedPreviewContent =
    [
      contactMarkdown,
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n") || initialContent || "";

  const [isGenerating, setIsGenerating] = useState(false);
  const canUseFormAsSource = !initialContent || isFormHydratedFromMarkdown;
  const hasUnsyncedMarkdownEdits =
    normalizeResumeMarkdownForCompare(previewContent) !==
    normalizeResumeMarkdownForCompare(syncedPreviewContent);

  useEffect(() => {
    reset(parsedInitialResume.values);
  }, [parsedInitialResume, reset]);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById("resume-pdf");
      const opt = {
        margin: [15, 15],
        filename: "resume.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async () => {
    try {
      if (activeTab === "edit" && !canUseFormAsSource) {
        toast.error(
          "This resume was not safely converted into form fields. Please use the Markdown tab to edit and save it."
        );
        return;
      }

      if (activeTab === "edit" && hasUnsyncedMarkdownEdits) {
        toast.error(
          "Markdown changes are newer than the form. Save from the Markdown tab or switch back to preview to resync the form output."
        );
        return;
      }

      await saveResumeFn(
        activeTab === "preview" ? previewContent : generatedPreviewContent
      );
      toast.success("Resume saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div data-color-mode="light" className="space-y-6">
      <div className="brand-page-header px-6 py-7 md:px-8">
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="brand-kicker">Resume workspace</p>
            <div>
              <h1 className="text-4xl font-semibold md:text-5xl lg:text-6xl gradient-title">
                Resume Builder
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                Move between structured editing and markdown preview, then save
                or export from the same fast workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={generatePDF} disabled={isGenerating} variant="outline">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Resume
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(nextTab) => {
          if (nextTab === "preview" && canUseFormAsSource) {
            setPreviewContent(generatedPreviewContent);
            setSyncedPreviewContent(generatedPreviewContent);
          }

          setActiveTab(nextTab);
        }}
      >
        <TabsList className="jobs-glow-inner w-full justify-start p-2 sm:w-auto">
          <TabsTrigger value="edit">Form</TabsTrigger>
          <TabsTrigger value="preview">Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4">
          {!canUseFormAsSource ? (
            <div className="jobs-glow-inner flex items-center gap-2 rounded-[22px] border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                Your existing markdown resume could not be safely mapped into the
                form. Edit and save it from the Markdown tab to avoid losing
                content.
              </span>
            </div>
          ) : null}

          {hasUnsyncedMarkdownEdits ? (
            <div className="jobs-glow-inner flex items-center gap-2 rounded-[22px] border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                Markdown edits are ahead of the form right now. Save from the
                Markdown tab or return to preview to sync the form-generated
                version first.
              </span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="jobs-glow-panel space-y-4 rounded-[28px] border border-border/70 p-5 md:p-6">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="jobs-glow-inner grid grid-cols-1 gap-4 rounded-[24px] border border-border/70 bg-background/40 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    {...register("contactInfo.email")}
                    type="email"
                    placeholder="your@email.com"
                  />
                  {errors.contactInfo?.email && (
                    <p className="text-sm text-red-400">
                      {errors.contactInfo.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mobile Number</label>
                  <Input
                    {...register("contactInfo.mobile")}
                    type="tel"
                    placeholder="+1 234 567 8900"
                  />
                  {errors.contactInfo?.mobile && (
                    <p className="text-sm text-red-400">
                      {errors.contactInfo.mobile.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <Input
                    {...register("contactInfo.linkedin")}
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                  {errors.contactInfo?.linkedin && (
                    <p className="text-sm text-red-400">
                      {errors.contactInfo.linkedin.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Twitter/X Profile</label>
                  <Input
                    {...register("contactInfo.twitter")}
                    type="url"
                    placeholder="https://twitter.com/your-handle"
                  />
                  {errors.contactInfo?.twitter && (
                    <p className="text-sm text-red-400">
                      {errors.contactInfo.twitter.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="jobs-glow-panel space-y-4 rounded-[28px] border border-border/70 p-5 md:p-6">
              <h3 className="text-lg font-medium">Professional Summary</h3>
              <Controller
                name="summary"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="Write a compelling professional summary..."
                  />
                )}
              />
              {errors.summary && (
                <p className="text-sm text-red-400">{errors.summary.message}</p>
              )}
            </div>

            <div className="jobs-glow-panel space-y-4 rounded-[28px] border border-border/70 p-5 md:p-6">
              <h3 className="text-lg font-medium">Skills</h3>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="List your key skills..."
                  />
                )}
              />
              {errors.skills && (
                <p className="text-sm text-red-400">{errors.skills.message}</p>
              )}
            </div>

            <div className="jobs-glow-panel space-y-4 rounded-[28px] border border-border/70 p-5 md:p-6">
              <h3 className="text-lg font-medium">Work Experience</h3>
              <Controller
                name="experience"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Experience"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.experience && (
                <p className="text-sm text-red-400">
                  {errors.experience.message}
                </p>
              )}
            </div>

            <div className="jobs-glow-panel space-y-4 rounded-[28px] border border-border/70 p-5 md:p-6">
              <h3 className="text-lg font-medium">Education</h3>
              <Controller
                name="education"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Education"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.education && (
                <p className="text-sm text-red-400">
                  {errors.education.message}
                </p>
              )}
            </div>

            <div className="jobs-glow-panel space-y-4 rounded-[28px] border border-border/70 p-5 md:p-6">
              <h3 className="text-lg font-medium">Projects</h3>
              <Controller
                name="projects"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Project"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.projects && (
                <p className="text-sm text-red-400">
                  {errors.projects.message}
                </p>
              )}
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {activeTab === "preview" && (
            <Button
              variant="link"
              type="button"
              className="mb-2"
              onClick={() =>
                setResumeMode(resumeMode === "preview" ? "edit" : "preview")
              }
            >
              {resumeMode === "preview" ? (
                <>
                  <Edit className="h-4 w-4" />
                  Edit Resume
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4" />
                  Show Preview
                </>
              )}
            </Button>
          )}

          {activeTab === "preview" && resumeMode !== "preview" && (
            <div className="jobs-glow-inner flex items-center gap-2 rounded-[22px] border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                You will lose edited markdown if you update the form data.
              </span>
            </div>
          )}
          <div className="overflow-hidden rounded-[28px] border border-border/70">
            <MDEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={800}
              preview={resumeMode}
            />
          </div>
          <div className="hidden">
            <div id="resume-pdf">
              <MDEditor.Markdown
                source={previewContent}
                style={{
                  background: "white",
                  color: "black",
                }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
