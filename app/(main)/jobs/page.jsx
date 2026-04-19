import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/actions/user";
import { getJobsPageData } from "@/actions/jobs";
import JobsHub from "./_components/jobs-hub";

export default async function JobsPage({ searchParams }) {
  const { isOnboarded } = await getUserOnboardingStatus();

  if (!isOnboarded) {
    redirect("/onboarding");
  }

  const {
    defaults,
    results,
    savedJobs,
    statusOptions,
    availableProviders,
    error,
  } =
    await getJobsPageData(searchParams);

  return (
    <JobsHub
      key={JSON.stringify({
        provider: results.criteria.provider,
        query: results.criteria.query,
        company: results.criteria.company,
        locality: results.criteria.locality,
        total: results.total,
        saved: savedJobs.length,
        error,
      })}
      defaults={defaults}
      results={results}
      savedJobs={savedJobs}
      statusOptions={statusOptions}
      availableProviders={availableProviders}
      error={error}
    />
  );
}
