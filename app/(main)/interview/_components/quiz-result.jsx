"use client";

import { Trophy, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function QuizResult({
  result,
  hideStartNew = false,
  onStartNew,
}) {
  if (!result) return null;

  return (
    <div className="mx-auto space-y-6">
      <h1 className="flex items-center gap-2 text-3xl gradient-title">
        <Trophy className="h-6 w-6 text-yellow-500" />
        Quiz Results
      </h1>

      <div className="space-y-6">
        <div className="jobs-glow-panel rounded-[28px] border border-border/70 p-5 text-center">
          <h3 className="text-2xl font-bold">{result.quizScore.toFixed(1)}%</h3>
          <Progress value={result.quizScore} className="mt-4 w-full" />
        </div>

        {result.improvementTip && (
          <div className="jobs-glow-inner rounded-[22px] border border-border/70 p-4">
            <p className="font-medium">Improvement Tip:</p>
            <p className="leading-7 text-muted-foreground">
              {result.improvementTip}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-medium">Question Review</h3>
          {result.questions.map((q, index) => (
            <div
              key={index}
              className="jobs-glow-panel space-y-3 rounded-[24px] border border-border/70 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{q.question}</p>
                {q.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Your answer: {q.userAnswer}</p>
                {!q.isCorrect && <p>Correct answer: {q.answer}</p>}
              </div>
              <div className="jobs-glow-inner rounded-[18px] p-3 text-sm">
                <p className="font-medium">Explanation:</p>
                <p className="leading-7">{q.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!hideStartNew && (
        <div>
          <Button onClick={onStartNew} className="w-full">
            Start New Quiz
          </Button>
        </div>
      )}
    </div>
  );
}
