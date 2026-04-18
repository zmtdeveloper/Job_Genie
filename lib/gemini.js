import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-2.5-flash-lite"];

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

function ensureGeminiApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
}

function getModelCandidates(model) {
  return [...new Set([model, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(Boolean))];
}

function isModelNotFoundError(error) {
  return error?.status === 404 || error?.message?.includes("is not found");
}

function buildConfig(config = {}) {
  return {
    // Keep low-latency behavior for app flows unless a caller explicitly overrides it.
    thinkingConfig: {
      thinkingBudget: 0,
    },
    ...config,
  };
}

export async function generateText({
  prompt,
  model = DEFAULT_MODEL,
  config,
}) {
  ensureGeminiApiKey();

  let lastError;

  for (const candidate of getModelCandidates(model)) {
    try {
      const response = await ai.models.generateContent({
        model: candidate,
        contents: prompt,
        config: buildConfig(config),
      });

      const text = response.text?.trim();

      if (!text) {
        throw new Error("Empty response from Gemini AI");
      }

      return text;
    } catch (error) {
      lastError = error;

      if (isModelNotFoundError(error) && candidate !== FALLBACK_MODELS.at(-1)) {
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Failed to generate content from Gemini AI");
}

export async function generateJson(options) {
  const text = await generateText({
    ...options,
    config: {
      responseMimeType: "application/json",
      ...(options?.config || {}),
    },
  });

  return parseJsonResponse(text);
}

export function parseJsonResponse(text) {
  const cleanedText = text
    .replace(/```(?:json)?\n?/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleanedText);
}
