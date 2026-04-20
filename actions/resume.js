"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateText } from "@/lib/gemini";
import { requireDbUser } from "@/lib/server-user";
import { withDbRetry } from "@/lib/prisma";

export async function saveResume(content) {
  const user = await requireDbUser({
    select: {
      id: true,
    },
  });

  try {
    const resume = await withDbRetry(() =>
      db.resume.upsert({
        where: {
          userId: user.id,
        },
        update: {
          content,
        },
        create: {
          userId: user.id,
          content,
        },
      })
    );

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const user = await requireDbUser({
    select: {
      id: true,
    },
  });

  return withDbRetry(() =>
    db.resume.findUnique({
      where: {
        userId: user.id,
      },
    })
  );
}

export async function improveWithAI({ current, type }) {
  const user = await requireDbUser({
    select: {
      industry: true,
    },
  });

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords
    
    Format the response as a single paragraph without any additional text or explanations.
  `;

  try {
    const improvedContent = await generateText({ prompt });
    return improvedContent;
  } catch (error) {
    console.error("Error improving content:", error);
    throw new Error("Failed to improve content");
  }
}
