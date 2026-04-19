import { getJobProviderConfig } from "./config";
import { JOB_MARKET_LABELS } from "./constants";
import {
  buildCompanyUrl,
  buildIndeedListingUrl,
  buildAbsoluteUrl,
  cleanString,
  extractJobSkills,
  formatSalary,
  isRemoteRole,
  stripHtmlToText,
} from "./utils";

const globalForJobsProviderCache = globalThis;
const jobsProviderCache =
  globalForJobsProviderCache.__jobsProviderCache || new Map();

if (!globalForJobsProviderCache.__jobsProviderCache) {
  globalForJobsProviderCache.__jobsProviderCache = jobsProviderCache;
}

function buildCacheKey(prefix, requestUrl) {
  return `${prefix}:${requestUrl.toString()}`;
}

function readCacheEntry(cacheKey) {
  return jobsProviderCache.get(cacheKey) || null;
}

function writeCachedJson(cacheKey, data) {
  jobsProviderCache.set(cacheKey, {
    data,
    createdAt: Date.now(),
  });
}

function buildExternalJobId(providerId, rawJobId) {
  return `${providerId}:${cleanString(rawJobId)}`;
}

function getMarketLabel(locality) {
  return JOB_MARKET_LABELS[cleanString(locality).toLowerCase()] || "United States";
}

function formatLinkedInEmploymentType(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  return values
    .map((value) =>
      cleanString(value)
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    )
    .filter(Boolean)
    .join(", ");
}

function formatLinkedInSalary(salaryRaw) {
  const salaryValue = salaryRaw?.value;

  if (!salaryValue) {
    return "";
  }

  return formatSalary({
    min: salaryValue?.minValue,
    max: salaryValue?.maxValue,
    type:
      cleanString(salaryValue?.unitText).toLowerCase() === "year"
        ? "yearly"
        : cleanString(salaryValue?.unitText).toLowerCase() === "hour"
          ? "hourly"
          : cleanString(salaryValue?.unitText).toLowerCase(),
  });
}

function getLinkedInLocation(item) {
  return (
    cleanString(item?.locations_derived?.[0]) ||
    cleanString(item?.locations_raw?.[0]?.address?.addressLocality) ||
    cleanString(item?.countries_derived?.[0]) ||
    ""
  );
}

function normalizeIndeedJobsResponse(responseJson, providerConfig, fallbackCompany = "") {
  const sourceUrl = cleanString(responseJson?.indeed_final_url);
  const items = Array.isArray(responseJson?.hits) ? responseJson.hits : [];

  return {
    total: Number(responseJson?.count) || 0,
    nextCursor:
      responseJson?.next_page_id ?? responseJson?.next_start ?? null,
    prevCursor: responseJson?.prev_start ?? null,
    sourceUrl,
    jobs: items
      .map((item, index) => {
        const rawJobId = cleanString(item?.id) || `job-${index}`;
        const title = cleanString(item?.title);

        if (!title) {
          return null;
        }

        return {
          id: rawJobId,
          externalJobId: buildExternalJobId(providerConfig.id, rawJobId),
          provider: providerConfig.id,
          providerName: providerConfig.name,
          title,
          company:
            cleanString(item?.company_name) ||
            cleanString(fallbackCompany) ||
            "Unknown company",
          location: cleanString(item?.location),
          locality: cleanString(item?.locality),
          postedAt: cleanString(item?.formatted_relative_time),
          salary: formatSalary(item?.salary),
          jobType: cleanString(item?.job_type),
          description: "",
          applyUrl: "",
          sourceUrl,
          keySkills: [],
          isRemote: isRemoteRole({
            title,
            location: cleanString(item?.location),
            jobType: cleanString(item?.job_type),
          }),
          url: buildIndeedListingUrl(
            rawJobId,
            providerConfig.linkBaseUrl,
            sourceUrl,
            item?.link
          ),
        };
      })
      .filter(Boolean),
  };
}

function normalizeIndeedJobDetailResponse(
  responseJson,
  providerConfig,
  fallbackJob = {}
) {
  const rawJobId = cleanString(responseJson?.id) || cleanString(fallbackJob?.id);
  const sourceUrl =
    cleanString(responseJson?.indeed_final_url) ||
    cleanString(fallbackJob?.sourceUrl);
  const listingUrl = buildIndeedListingUrl(
    rawJobId,
    providerConfig.linkBaseUrl,
    sourceUrl,
    fallbackJob?.url || fallbackJob?.listingUrl
  );

  const job = {
    id: rawJobId,
    externalJobId:
      cleanString(fallbackJob?.externalJobId) ||
      buildExternalJobId(providerConfig.id, rawJobId),
    provider: providerConfig.id,
    providerName: providerConfig.name,
    title:
      cleanString(responseJson?.job_title) || cleanString(fallbackJob?.title),
    company:
      cleanString(responseJson?.company?.name) ||
      cleanString(fallbackJob?.company) ||
      "Unknown company",
    location:
      cleanString(responseJson?.location) || cleanString(fallbackJob?.location),
    locality:
      cleanString(responseJson?.locality) || cleanString(fallbackJob?.locality),
    postedAt:
      cleanString(responseJson?.formatted_relative_time) ||
      cleanString(fallbackJob?.postedAt),
    salary:
      formatSalary(responseJson?.salary) || cleanString(fallbackJob?.salary),
    jobType:
      cleanString(responseJson?.job_type) || cleanString(fallbackJob?.jobType),
    description:
      stripHtmlToText(responseJson?.description) ||
      cleanString(fallbackJob?.description),
    applyUrl: buildAbsoluteUrl(
      responseJson?.apply_url,
      providerConfig.linkBaseUrl,
      sourceUrl || providerConfig.linkBaseUrl
    ),
    sourceUrl,
    url: listingUrl,
  };

  return {
    ...job,
    keySkills: extractJobSkills(job),
    isRemote: isRemoteRole(job),
  };
}

function normalizeLinkedInJobsResponse(responseJson, providerConfig, locality) {
  const items = Array.isArray(responseJson) ? responseJson : [];

  return {
    total: items.length,
    nextCursor: null,
    prevCursor: null,
    sourceUrl: "",
    jobs: items
      .map((item, index) => {
        const rawJobId = cleanString(item?.id) || `linkedin-job-${index}`;
        const title = cleanString(item?.title);

        if (!title) {
          return null;
        }

        const location = getLinkedInLocation(item);
        const description = cleanString(item?.description_text);

        return {
          id: rawJobId,
          externalJobId: buildExternalJobId(providerConfig.id, rawJobId),
          provider: providerConfig.id,
          providerName: providerConfig.name,
          title,
          company: cleanString(item?.organization) || "Unknown company",
          location,
          locality: cleanString(locality),
          postedAt: cleanString(item?.date_posted),
          salary: formatLinkedInSalary(item?.salary_raw),
          jobType: formatLinkedInEmploymentType(item?.employment_type),
          description,
          applyUrl:
            cleanString(item?.external_apply_url) || cleanString(item?.url),
          sourceUrl: cleanString(item?.organization_url),
          keySkills: extractJobSkills({
            title,
            description,
            keySkills: item?.linkedin_org_specialties || [],
          }),
          isRemote: Boolean(item?.remote_derived),
          url: cleanString(item?.url),
        };
      })
      .filter(Boolean),
  };
}

async function fetchProviderJson(requestUrl, providerConfig, options = {}) {
  const {
    cacheNamespace = "search",
    cacheTtlMs = 1000 * 60 * 10,
  } = options;
  const cacheKey = buildCacheKey(cacheNamespace, requestUrl);
  const cachedEntry = readCacheEntry(cacheKey);
  const cachedJson = cachedEntry?.data || null;

  if (cachedEntry && Date.now() - cachedEntry.createdAt <= cacheTtlMs) {
    return cachedEntry.data;
  }

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      next: {
        revalidate: 600,
      },
      headers: {
        "Content-Type": "application/json",
        [providerConfig.apiHostHeader]: providerConfig.apiHost,
        [providerConfig.apiKeyHeader]: providerConfig.apiKey,
      },
    });

    if (!response.ok) {
      const responseBody = cleanString(await response.text());

      if (response.status === 429 && cachedJson) {
        return cachedJson;
      }

      if (response.status === 429) {
        if (responseBody.toLowerCase().includes("monthly quota")) {
          throw new Error(
            `${providerConfig.name} monthly quota has been exceeded on the current RapidAPI plan. Add a fresh key or upgrade the plan to restore live search results.`
          );
        }

        throw new Error(
          `${providerConfig.name} is rate-limiting requests right now. Please wait a minute and search again.`
        );
      }

      throw new Error(
        responseBody
          ? `${providerConfig.name} request failed with status ${response.status}. ${responseBody}`
          : `${providerConfig.name} request failed with status ${response.status}`
      );
    }

    const responseJson = await response.json();
    writeCachedJson(cacheKey, responseJson);
    return responseJson;
  } catch (error) {
    if (cachedJson) {
      return cachedJson;
    }

    throw error;
  }
}

async function fetchIndeedKeywordJobs(criteria, providerConfig) {
  const requestUrl = new URL(providerConfig.searchUrl);
  requestUrl.searchParams.set("query", criteria.query);
  requestUrl.searchParams.set("locality", criteria.locality);
  requestUrl.searchParams.set("start", criteria.start);

  const responseJson = await fetchProviderJson(requestUrl, providerConfig, {
    cacheNamespace: `search:${providerConfig.id}`,
    cacheTtlMs: 1000 * 60 * 10,
  });

  return normalizeIndeedJobsResponse(responseJson, providerConfig);
}

async function fetchIndeedCompanyJobs(criteria, providerConfig) {
  const requestUrl = buildCompanyUrl(
    providerConfig.companyUrlTemplate,
    criteria.company,
    criteria.locality,
    criteria.start
  );

  const responseJson = await fetchProviderJson(requestUrl, providerConfig, {
    cacheNamespace: `company:${providerConfig.id}`,
    cacheTtlMs: 1000 * 60 * 15,
  });

  return normalizeIndeedJobsResponse(
    responseJson,
    providerConfig,
    criteria.company
  );
}

async function fetchLinkedInJobs(criteria, providerConfig) {
  const requestUrl = new URL(providerConfig.searchUrl);
  requestUrl.searchParams.set("limit", "10");
  requestUrl.searchParams.set("offset", "0");
  requestUrl.searchParams.set("title_filter", `"${criteria.query}"`);
  requestUrl.searchParams.set("location_filter", `"${getMarketLabel(criteria.locality)}"`);
  requestUrl.searchParams.set("description_type", "text");

  const responseJson = await fetchProviderJson(requestUrl, providerConfig, {
    cacheNamespace: `search:${providerConfig.id}`,
    cacheTtlMs: 1000 * 60 * 10,
  });

  return normalizeLinkedInJobsResponse(
    responseJson,
    providerConfig,
    criteria.locality
  );
}

function buildIndeedDetailRequestUrl(jobId, locality, providerConfig) {
  const requestUrl = providerConfig.detailUrlTemplate.replace(
    "{jobId}",
    encodeURIComponent(cleanString(jobId))
  );
  const url = new URL(requestUrl);

  if (cleanString(locality)) {
    url.searchParams.set("locality", locality);
  }

  return url;
}

export async function fetchJobsFromProvider(criteria) {
  const providerConfig = getJobProviderConfig(criteria.provider);

  if (providerConfig.id === "linkedin") {
    return fetchLinkedInJobs(criteria, providerConfig);
  }

  return fetchIndeedKeywordJobs(criteria, providerConfig);
}

export async function fetchCompanyJobs(criteria) {
  const providerConfig = getJobProviderConfig(criteria.provider);

  if (!providerConfig.supportsCompanyEndpoint) {
    return {
      total: 0,
      nextCursor: null,
      prevCursor: null,
      sourceUrl: "",
      jobs: [],
    };
  }

  return fetchIndeedCompanyJobs(criteria, providerConfig);
}

export async function fetchJobDetailFromProvider({
  provider,
  jobId,
  locality,
  fallbackJob,
}) {
  const providerConfig = getJobProviderConfig(provider);

  if (!providerConfig.supportsDetailEndpoint) {
    return {
      ...(fallbackJob || {}),
      provider: providerConfig.id,
      providerName: providerConfig.name,
      keySkills:
        fallbackJob?.keySkills?.length > 0
          ? fallbackJob.keySkills
          : extractJobSkills(fallbackJob || {}),
    };
  }

  const requestUrl = buildIndeedDetailRequestUrl(jobId, locality, providerConfig);
  const responseJson = await fetchProviderJson(requestUrl, providerConfig, {
    cacheNamespace: `detail:${providerConfig.id}`,
    cacheTtlMs: 1000 * 60 * 30,
  });

  return normalizeIndeedJobDetailResponse(
    responseJson,
    providerConfig,
    fallbackJob
  );
}
