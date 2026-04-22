import { getAssessments } from "@/actions/interview";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCards from "./_components/stats-cards";
import PerformanceChart from "./_components/performace-chart";
import QuizList from "./_components/quiz-list";

export default async function InterviewPrepPage() {
  const assessments = await getAssessments();

  return (
    <div className="space-y-6">
      <div className="brand-page-header px-6 py-7 md:px-8">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="brand-kicker">Interview practice</p>
            <h1 className="mt-3 text-4xl font-semibold md:text-5xl gradient-title">
              Interview Preparation
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Practice tailored quizzes, review trends in your performance, and
              jump into a fresh mock interview whenever you are ready.
            </p>
          </div>

          <Button asChild>
            <Link href="/interview/mock">
              <Sparkles className="h-4 w-4" />
              Start Mock Interview
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <StatsCards assessments={assessments} />
        <PerformanceChart assessments={assessments} />
        <QuizList assessments={assessments} />
      </div>
    </div>
  );
}
