import { JOB_PROVIDER_OPTIONS } from "./constants";

function readEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

function buildIndeedProviderConfig() {
  const provider = {
    id: "indeed",
    name: readEnv("JOBS_INDEED_PROVIDER_NAME", "Indeed"),
    searchUrl: readEnv(
      "JOBS_INDEED_API_SEARCH_URL",
      readEnv("JOBS_API_SEARCH_URL", "https://indeed12.p.rapidapi.com/jobs/search")
    ),
    companyUrlTemplate: readEnv(
      "JOBS_INDEED_API_COMPANY_URL_TEMPLATE",
      readEnv(
        "JOBS_API_COMPANY_URL_TEMPLATE",
        "https://indeed12.p.rapidapi.com/company/{company}/jobs"
      )
    ),
    detailUrlTemplate: readEnv(
      "JOBS_INDEED_API_DETAIL_URL_TEMPLATE",
      readEnv(
        "JOBS_API_DETAIL_URL_TEMPLATE",
        "https://indeed12.p.rapidapi.com/job/{jobId}"
      )
    ),
    apiHost: readEnv("JOBS_INDEED_API_HOST", readEnv("JOBS_API_HOST")),
    apiKey: readEnv("JOBS_INDEED_API_KEY", readEnv("JOBS_API_KEY")),
    apiKeyHeader: readEnv("JOBS_INDEED_API_KEY_HEADER", "x-rapidapi-key"),
    apiHostHeader: readEnv("JOBS_INDEED_API_HOST_HEADER", "x-rapidapi-host"),
    linkBaseUrl: readEnv(
      "JOBS_INDEED_LINK_BASE_URL",
      readEnv("JOBS_LINK_BASE_URL", "https://www.indeed.com")
    ),
    supportsCompanyEndpoint: true,
    supportsDetailEndpoint: true,
  };

  return provider.searchUrl && provider.apiHost && provider.apiKey
    ? provider
    : null;
}

function buildLinkedInProviderConfig() {
  const provider = {
    id: "linkedin",
    name: readEnv("JOBS_LINKEDIN_PROVIDER_NAME", "LinkedIn"),
    searchUrl: readEnv(
      "JOBS_LINKEDIN_API_SEARCH_URL",
      "https://linkedin-job-search-api.p.rapidapi.com/active-jb-24h"
    ),
    apiHost: readEnv(
      "JOBS_LINKEDIN_API_HOST",
      "linkedin-job-search-api.p.rapidapi.com"
    ),
    apiKey: readEnv("JOBS_LINKEDIN_API_KEY"),
    apiKeyHeader: readEnv("JOBS_LINKEDIN_API_KEY_HEADER", "x-rapidapi-key"),
    apiHostHeader: readEnv("JOBS_LINKEDIN_API_HOST_HEADER", "x-rapidapi-host"),
    linkBaseUrl: readEnv(
      "JOBS_LINKEDIN_LINK_BASE_URL",
      "https://www.linkedin.com"
    ),
    supportsCompanyEndpoint: false,
    supportsDetailEndpoint: false,
  };

  return provider.searchUrl && provider.apiHost && provider.apiKey
    ? provider
    : null;
}

export function getJobsConfig() {
  const defaultLocality = readEnv("JOBS_DEFAULT_LOCALITY", "us");
  const providers = {};

  const indeedProvider = buildIndeedProviderConfig();
  const linkedInProvider = buildLinkedInProviderConfig();

  if (indeedProvider) {
    providers.indeed = indeedProvider;
  }

  if (linkedInProvider) {
    providers.linkedin = linkedInProvider;
  }

  const availableProviders = JOB_PROVIDER_OPTIONS.filter(
    (option) => providers[option.value]
  );
  const defaultProviderCandidate = readEnv(
    "JOBS_DEFAULT_PROVIDER",
    availableProviders[0]?.value || "indeed"
  ).toLowerCase();
  const defaultProvider = providers[defaultProviderCandidate]
    ? defaultProviderCandidate
    : availableProviders[0]?.value;

  if (!defaultProvider) {
    throw new Error(
      "Jobs providers are not configured. Add at least one provider key in your environment."
    );
  }

  return {
    defaultLocality,
    defaultProvider,
    providers,
    availableProviders,
  };
}

export function getJobProviderConfig(providerId) {
  const config = getJobsConfig();
  const normalizedProviderId = (providerId || "").toLowerCase();

  return (
    config.providers[normalizedProviderId] ||
    config.providers[config.defaultProvider]
  );
}
