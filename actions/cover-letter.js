"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { generateText } from "@/lib/gemini";

const COVER_LETTER_MODEL =
  process.env.GEMINI_COVER_LETTER_MODEL || "gemini-2.5-flash-lite";
const MAX_DB_RETRIES = 2;
const DB_RETRY_DELAY_MS = 400;
const MAX_JOB_DESCRIPTION_LENGTH = 2500;
const MAX_COVER_LETTER_WORDS = 170;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDatabaseError(error) {
  const message = String(error?.message || "").toLowerCase();
  const cause = String(error?.cause?.message || "").toLowerCase();

  return (
    message.includes("connection terminated") ||
    message.includes("connection timeout") ||
    message.includes("timed out") ||
    cause.includes("connection terminated") ||
    cause.includes("connection timeout") ||
    cause.includes("timed out")
  );
}

async function withDatabaseRetry(operation) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_DB_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientDatabaseError(error) || attempt === MAX_DB_RETRIES) {
        throw error;
      }

      await delay(DB_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}

function getCoverLetterErrorMessage(error) {
  const message = String(error?.message || "");
  const normalizedMessage = message.toLowerCase();
  const status = Number(error?.status || error?.error?.code || 0);
  const apiStatus = String(error?.error?.status || "").toUpperCase();

  if (
    status === 503 ||
    apiStatus === "UNAVAILABLE" ||
    normalizedMessage.includes("high demand") ||
    normalizedMessage.includes("try again later")
  ) {
    return "AI model is busy right now. Please try again in a minute.";
  }

  if (isTransientDatabaseError(error)) {
    return "Database connection timed out while saving your cover letter. Please try again.";
  }

  if (normalizedMessage.includes("gemini_api_key")) {
    return "Gemini API key is missing. Please configure it and try again.";
  }

  return "Failed to generate cover letter";
}

function normalizeGeneratedCoverLetter(content, jobTitle) {
  const normalizedTitle = String(jobTitle || "Job Position").trim() || "Job Position";

  const cleaned = String(content || "")
    .replace(/\r\n/g, "\n")
    .replace(/```(?:markdown)?\n?/gi, "")
    .replace(/```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const hasSubject = /(^|\n)subject\s*:/i.test(cleaned);
  const wordBudget = cleaned.split(/\s+/).filter(Boolean).slice(0, MAX_COVER_LETTER_WORDS);
  const trimmedContent = wordBudget.join(" ").trim();

  if (!hasSubject) {
    return [
      `Subject: Application for ${normalizedTitle}`,
      "",
      trimmedContent,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return cleaned;
}

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const normalizedInput = {
      companyName: String(data?.companyName || "").trim(),
      jobTitle: String(data?.jobTitle || "").trim(),
      jobDescription: String(data?.jobDescription || "")
        .trim()
        .slice(0, MAX_JOB_DESCRIPTION_LENGTH),
    };

    const user = await withDatabaseRetry(() =>
      db.user.findUnique({
        where: { clerkUserId: userId },
        select: {
          id: true,
          industry: true,
          experience: true,
          skills: true,
          bio: true,
        },
      })
    );

    if (!user) {
      throw new Error("User not found");
    }

    const prompt = `
      Write a very short email-style cover letter for the ${normalizedInput.jobTitle} role at ${normalizedInput.companyName}.
      
      Candidate profile:
      - Industry: ${user.industry}
      - Years of Experience: ${user.experience}
      - Skills: ${user.skills?.join(", ")}
      - Professional Background: ${user.bio}
      
      Job Description:
      ${normalizedInput.jobDescription}

      Requirements:
      1. Keep it short and simple, around 120 to ${MAX_COVER_LETTER_WORDS} words total.
      2. Use plain email format, not a long traditional cover letter.
      3. Use exactly this structure:
         Subject: Application for ${normalizedInput.jobTitle}
         
         Dear Hiring Manager,
         
         One short opening line.
         
         One short paragraph about relevant skills and fit.
         
         One short closing paragraph asking for the opportunity to discuss further.
         
         Sincerely,
         [Your Name]
         [Your Contact Information]
      4. Do not include date, company address, bullet points, headings, or extra sections.
      5. Keep paragraphs short like the sample email style.
      6. Use straightforward, natural language.
      
      Output plain text only.
    `;

    const generatedContent = await generateText({
      prompt,
      model: COVER_LETTER_MODEL,
    });
    const content = normalizeGeneratedCoverLetter(
      generatedContent,
      normalizedInput.jobTitle
    );

    const coverLetter = await withDatabaseRetry(() =>
      db.coverLetter.create({
        data: {
          content,
          jobDescription: normalizedInput.jobDescription,
          companyName: normalizedInput.companyName,
          jobTitle: normalizedInput.jobTitle,
          status: "completed",
          userId: user.id,
        },
      })
    );

    return {
      id: coverLetter.id,
      companyName: coverLetter.companyName,
      jobTitle: coverLetter.jobTitle,
    };
  } catch (error) {
    console.error("Error generating cover letter:", {
      message: error?.message,
      status: error?.status || error?.error?.code,
      apiStatus: error?.error?.status,
      cause: error?.cause?.message,
    });
    throw new Error(getCoverLetterErrorMessage(error));
  }
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await withDatabaseRetry(() =>
    db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
      },
    })
  );

  if (!user) throw new Error("User not found");

  return await withDatabaseRetry(() =>
    db.coverLetter.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        jobDescription: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  );
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await withDatabaseRetry(() =>
    db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
      },
    })
  );

  if (!user) throw new Error("User not found");

  return await withDatabaseRetry(() =>
    db.coverLetter.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        content: true,
        companyName: true,
        jobTitle: true,
        createdAt: true,
      },
    })
  );
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await withDatabaseRetry(() =>
    db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
      },
    })
  );

  if (!user) throw new Error("User not found");

  const result = await withDatabaseRetry(() =>
    db.coverLetter.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    })
  );

  if (result.count === 0) {
    throw new Error("Cover letter not found");
  }

  return result;
}
