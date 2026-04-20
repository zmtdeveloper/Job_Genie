"use server";

import { db } from "@/lib/prisma";
import { generateJson, generateText } from "@/lib/gemini";
import { requireDbUser } from "@/lib/server-user";
import { withDbRetry } from "@/lib/prisma";
import { z } from "zod";

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

const quizQuestionSchema = z
  .object({
    question: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).length(4),
    correctAnswer: z.string().trim().min(1),
    explanation: z.string().trim().min(1),
  })
  .superRefine((question, context) => {
    if (!question.options.includes(question.correctAnswer)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Correct answer must match one of the options",
        path: ["correctAnswer"],
      });
    }
  });

const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).length(10),
});

function normalizeQuizPayload(payload) {
  const result = quizSchema.safeParse(payload);

  if (!result.success) {
    throw new Error("Generated quiz content was invalid");
  }

  return result.data.questions;
}

export async function generateQuiz(jobContext = null) {
  const user = await requireDbUser({
    select: {
      industry: true,
      skills: true,
    },
  });

  const normalizedJobContext = {
    jobTitle: cleanString(jobContext?.jobTitle),
    companyName: cleanString(jobContext?.companyName),
    jobDescription: cleanString(jobContext?.jobDescription).slice(0, 3000),
    keySkills: cleanString(jobContext?.keySkills),
  };

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    ${
      normalizedJobContext.jobTitle
        ? `Tailor the quiz for the role "${normalizedJobContext.jobTitle}"${normalizedJobContext.companyName ? ` at ${normalizedJobContext.companyName}` : ""}.`
        : ""
    }
    ${
      normalizedJobContext.keySkills
        ? `Make sure the quiz covers these role signals when relevant: ${normalizedJobContext.keySkills}.`
        : ""
    }
    ${
      normalizedJobContext.jobDescription
        ? `Job context:\n${normalizedJobContext.jobDescription}`
        : ""
    }
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const quiz = await generateJson({ prompt });
    return normalizeQuizPayload(quiz);
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(questions, answers, score) {
  const user = await requireDbUser({
    select: {
      id: true,
      industry: true,
    },
  });

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      improvementTip = await generateText({ prompt: improvementPrompt });
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    const assessment = await withDbRetry(() =>
      db.assessment.create({
        data: {
          userId: user.id,
          quizScore: score,
          questions: questionResults,
          category: "Technical",
          improvementTip,
        },
      })
    );

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const user = await requireDbUser({
    select: {
      id: true,
    },
  });

  try {
    const assessments = await withDbRetry(() =>
      db.assessment.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "asc",
        },
      })
    );

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
