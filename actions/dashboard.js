"use server";

import { db } from "@/lib/prisma";
import { generateJson } from "@/lib/gemini";
import { withDbRetry } from "@/lib/prisma";
import { requireDbUser } from "@/lib/server-user";
import { z } from "zod";

const salaryRangeSchema = z.object({
  role: z.string().trim().min(1),
  min: z.coerce.number().finite().nonnegative(),
  max: z.coerce.number().finite().nonnegative(),
  median: z.coerce.number().finite().nonnegative(),
  location: z.string().trim().optional().default(""),
});

const normalizeStringList = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    )
  );

const industryInsightsSchema = z.object({
  salaryRanges: z.array(salaryRangeSchema).min(1).max(12),
  growthRate: z.coerce.number().finite().min(-100).max(1000),
  demandLevel: z
    .string()
    .trim()
    .transform((value) => {
      const normalizedValue = value.toLowerCase();

      if (normalizedValue === "high") return "High";
      if (normalizedValue === "low") return "Low";
      return "Medium";
    }),
  topSkills: z.array(z.string()).transform(normalizeStringList),
  marketOutlook: z
    .string()
    .trim()
    .transform((value) => {
      const normalizedValue = value.toLowerCase();

      if (normalizedValue === "positive") return "Positive";
      if (normalizedValue === "negative") return "Negative";
      return "Neutral";
    }),
  keyTrends: z.array(z.string()).transform(normalizeStringList),
  recommendedSkills: z.array(z.string()).transform(normalizeStringList),
});

function normalizeIndustryInsights(rawInsights) {
  const result = industryInsightsSchema.safeParse(rawInsights);

  if (!result.success) {
    throw new Error("Generated industry insights were invalid");
  }

  return {
    ...result.data,
    topSkills: result.data.topSkills.slice(0, 12),
    keyTrends: result.data.keyTrends.slice(0, 12),
    recommendedSkills: result.data.recommendedSkills.slice(0, 12),
  };
}

function buildIndustryInsightPayload(industry, insights) {
  return {
    industry,
    ...insights,
    lastUpdated: new Date(),
    nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

export const generateAIInsights = async (industry) => {
  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

  const rawInsights = await generateJson({ prompt });
  return normalizeIndustryInsights(rawInsights);
};

export async function getOrCreateIndustryInsight(industry) {
  if (!industry) {
    throw new Error("Industry is required");
  }

  const existingInsight = await withDbRetry(() =>
    db.industryInsight.findUnique({
      where: { industry },
    })
  );

  if (existingInsight) {
    return existingInsight;
  }

  const insights = await generateAIInsights(industry);

  try {
    return await withDbRetry(() =>
      db.industryInsight.create({
        data: buildIndustryInsightPayload(industry, insights),
      })
    );
  } catch (error) {
    if (error?.code !== "P2002") {
      throw error;
    }

    const concurrentInsight = await withDbRetry(() =>
      db.industryInsight.findUnique({
        where: { industry },
      })
    );

    if (concurrentInsight) {
      return concurrentInsight;
    }

    throw error;
  }
}

export async function getIndustryInsights() {
  const user = await requireDbUser({
    industry: true,
    industryInsight: true,
  });

  if (!user.industry) {
    throw new Error("Complete onboarding to unlock industry insights");
  }

  if (!user.industryInsight) {
    return getOrCreateIndustryInsight(user.industry);
  }

  return user.industryInsight;
}
