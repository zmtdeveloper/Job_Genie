export function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function splitExternalJobId(value) {
  const normalizedValue = cleanString(value);

  if (!normalizedValue.includes(":")) {
    return {
      provider: "",
      rawId: normalizedValue,
    };
  }

  const [provider, ...rest] = normalizedValue.split(":");

  return {
    provider: cleanString(provider).toLowerCase(),
    rawId: cleanString(rest.join(":")),
  };
}

const BASIC_HTML_ENTITIES = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

const STOP_WORDS = new Set([
  "about",
  "across",
  "after",
  "also",
  "among",
  "and",
  "applicant",
  "applications",
  "apply",
  "are",
  "been",
  "build",
  "building",
  "business",
  "candidate",
  "collaborate",
  "company",
  "contract",
  "create",
  "customers",
  "days",
  "deliver",
  "development",
  "engineer",
  "engineering",
  "environment",
  "experience",
  "for",
  "from",
  "full",
  "good",
  "have",
  "help",
  "high",
  "hours",
  "hybrid",
  "ideas",
  "into",
  "job",
  "knowledge",
  "lead",
  "looking",
  "more",
  "must",
  "need",
  "our",
  "partner",
  "people",
  "plus",
  "product",
  "program",
  "quality",
  "remote",
  "role",
  "team",
  "teams",
  "that",
  "their",
  "them",
  "they",
  "this",
  "through",
  "time",
  "using",
  "work",
  "working",
  "world",
  "years",
  "you",
  "your",
]);

const KNOWN_JOB_SKILLS = [
  "React",
  "Next.js",
  "JavaScript",
  "TypeScript",
  "Node.js",
  "Express",
  "Python",
  "Django",
  "Flask",
  "Java",
  "Spring",
  "C++",
  "C#",
  ".NET",
  "Go",
  "Rust",
  "PHP",
  "Laravel",
  "Ruby on Rails",
  "Swift",
  "Kotlin",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Prisma",
  "GraphQL",
  "REST",
  "API Design",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "CI/CD",
  "DevOps",
  "Linux",
  "Security",
  "Networking",
  "Testing",
  "Automation",
  "Selenium",
  "Playwright",
  "Jest",
  "Cypress",
  "UI Design",
  "UX Design",
  "Figma",
  "Product Design",
  "Data Analysis",
  "Analytics",
  "Machine Learning",
  "AI",
  "Prompting",
  "LLMs",
  "Computer Vision",
  "Game Design",
  "Gameplay",
  "Animation",
  "Rigging",
  "Rendering",
  "VFX",
  "Unreal Engine",
  "Unity",
  "Leadership",
  "Mentoring",
  "Communication",
  "Stakeholder Management",
  "Project Management",
  "Agile",
  "Scrum",
];

export function buildAbsoluteUrl(link, linkBaseUrl, fallbackBaseUrl) {
  const normalizedLink = cleanString(link);

  if (!normalizedLink) {
    return cleanString(fallbackBaseUrl);
  }

  if (/^https?:\/\//i.test(normalizedLink)) {
    return normalizedLink;
  }

  const baseUrl = cleanString(linkBaseUrl) || cleanString(fallbackBaseUrl);

  if (!baseUrl) {
    return normalizedLink;
  }

  try {
    return new URL(normalizedLink, baseUrl).toString();
  } catch {
    return normalizedLink;
  }
}

export function buildIndeedListingUrl(
  jobId,
  linkBaseUrl,
  fallbackBaseUrl,
  originalLink
) {
  const normalizedJobId = cleanString(jobId);
  const baseUrl = cleanString(linkBaseUrl) || cleanString(fallbackBaseUrl);

  if (normalizedJobId && baseUrl) {
    try {
      const url = new URL("/viewjob", baseUrl);
      url.searchParams.set("jk", normalizedJobId);
      return url.toString();
    } catch {
      return `${baseUrl.replace(/\/$/, "")}/viewjob?jk=${encodeURIComponent(
        normalizedJobId
      )}`;
    }
  }

  return buildAbsoluteUrl(originalLink, linkBaseUrl, fallbackBaseUrl);
}

export function formatSalary(salary) {
  if (!salary || (salary.min == null && salary.max == null)) {
    return "";
  }

  const type = cleanString(salary.type).toLowerCase();
  const unit =
    type === "hourly"
      ? "/hr"
      : type === "yearly"
        ? "/yr"
        : "";

  const parts = [salary.min, salary.max]
    .filter((value) => typeof value === "number")
    .map((value) => `$${value.toLocaleString()}`);

  if (parts.length === 2) {
    return `${parts[0]} - ${parts[1]}${unit}`;
  }

  if (parts.length === 1) {
    return `${parts[0]}${unit}`;
  }

  return "";
}

export function buildCompanyUrl(template, company, locality, start) {
  const requestUrl = template.replace(
    "{company}",
    encodeURIComponent(cleanString(company))
  );
  const url = new URL(requestUrl);
  url.searchParams.set("locality", locality);
  url.searchParams.set("start", start);
  return url;
}

export function uniqueTokens(values) {
  return [...new Set(tokenize(values))];
}

export function tokenize(value) {
  const source = Array.isArray(value) ? value.join(" ") : value || "";

  return String(source)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function decodeHtmlEntities(value) {
  return Object.entries(BASIC_HTML_ENTITIES).reduce(
    (result, [entity, replacement]) => result.replaceAll(entity, replacement),
    value
  );
}

export function stripHtmlToText(html) {
  const normalizedHtml = cleanString(html);

  if (!normalizedHtml) {
    return "";
  }

  return decodeHtmlEntities(
    normalizedHtml
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/li>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s{2,}/g, " ")
  ).trim();
}

function toTitleCase(token) {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function isRemoteRole(job) {
  const source = [
    cleanString(job?.title),
    cleanString(job?.location),
    cleanString(job?.jobType),
  ]
    .join(" ")
    .toLowerCase();

  return source.includes("remote") || source.includes("hybrid");
}

export function extractJobSkills(job, userSkills = []) {
  const source = [
    cleanString(job?.title),
    cleanString(job?.description),
    ...(Array.isArray(job?.keySkills) ? job.keySkills : []),
  ]
    .join(" ")
    .toLowerCase();

  const knownMatches = KNOWN_JOB_SKILLS.filter((skill) =>
    source.includes(skill.toLowerCase())
  );

  const boostedUserSkills = (userSkills || []).filter((skill) =>
    source.includes(cleanString(skill).toLowerCase())
  );

  if (knownMatches.length >= 6) {
    return [...new Set([...knownMatches, ...boostedUserSkills])].slice(0, 8);
  }

  const frequencyMap = tokenize(source).reduce((accumulator, token) => {
    if (STOP_WORDS.has(token)) {
      return accumulator;
    }

    accumulator[token] = (accumulator[token] || 0) + 1;
    return accumulator;
  }, {});

  const frequencyMatches = Object.entries(frequencyMap)
    .sort((left, right) => right[1] - left[1])
    .map(([token]) => toTitleCase(token))
    .slice(0, 8);

  return [...new Set([...knownMatches, ...boostedUserSkills, ...frequencyMatches])].slice(
    0,
    8
  );
}

export function buildAtsAnalysis(job, resumeContent) {
  const normalizedResume = cleanString(resumeContent);

  if (!normalizedResume) {
    return {
      score: null,
      summary: "",
      matchedKeywords: [],
      missingKeywords: [],
    };
  }

  const keySkills = extractJobSkills(job);
  const titleTokens = uniqueTokens(job?.title);
  const resumeTokens = uniqueTokens(normalizedResume);
  const resumeLower = normalizedResume.toLowerCase();

  const matchedSkillKeywords = keySkills.filter((skill) =>
    resumeLower.includes(skill.toLowerCase())
  );
  const missingSkillKeywords = keySkills.filter(
    (skill) => !resumeLower.includes(skill.toLowerCase())
  );
  const matchedTitleTokens = titleTokens.filter((token) =>
    resumeTokens.includes(token)
  );
  const missingTitleTokens = titleTokens.filter(
    (token) => !resumeTokens.includes(token) && !STOP_WORDS.has(token)
  );

  const totalSignals = keySkills.length + Math.max(titleTokens.length, 1);
  const matchedSignals =
    matchedSkillKeywords.length + Math.min(matchedTitleTokens.length, 4);
  const coverage = totalSignals > 0 ? matchedSignals / totalSignals : 0;
  const score = Math.max(34, Math.min(97, Math.round(coverage * 100)));

  let summary =
    "Your resume can be aligned more tightly with this role's language.";

  if (score >= 78) {
    summary = "Your resume already mirrors the strongest signals for this role.";
  } else if (score >= 60) {
    summary = "Your resume is close, but a few keywords would make it stronger.";
  }

  if (missingSkillKeywords.length > 0) {
    summary += ` Consider weaving in ${missingSkillKeywords
      .slice(0, 3)
      .join(", ")} where it is truthful.`;
  }

  return {
    score,
    summary,
    matchedKeywords: [
      ...new Set([
        ...matchedSkillKeywords,
        ...matchedTitleTokens.map((token) => toTitleCase(token)),
      ]),
    ].slice(0, 5),
    missingKeywords: [
      ...new Set([
        ...missingSkillKeywords,
        ...missingTitleTokens.map((token) => toTitleCase(token)),
      ]),
    ].slice(0, 5),
  };
}

export function parseRelativeAge(text) {
  const value = cleanString(text).toLowerCase();

  if (!value) {
    return null;
  }

  const parsedTimestamp = Date.parse(text);

  if (!Number.isNaN(parsedTimestamp)) {
    const ageInMs = Date.now() - parsedTimestamp;

    if (ageInMs < 0) {
      return 0;
    }

    return Math.floor(ageInMs / (1000 * 60 * 60 * 24));
  }

  if (
    value.includes("today") ||
    value.includes("hoy") ||
    value.includes("hour") ||
    value.includes("hora")
  ) {
    return 0;
  }

  const daysMatch = value.match(/(\d+)\s*(day|dias|dia)/);

  if (daysMatch) {
    return Number(daysMatch[1]);
  }

  const weeksMatch = value.match(/(\d+)\s*(week|semana|semanas)/);

  if (weeksMatch) {
    return Number(weeksMatch[1]) * 7;
  }

  if (value.includes("30+")) {
    return 30;
  }

  return null;
}

export function scoreJobMatch(job, criteria, profile) {
  const titleTokens = uniqueTokens(job.title);
  const roleTokens = uniqueTokens(criteria.query);
  const skillTokens = uniqueTokens(profile.skills || []);
  const industryTokens = uniqueTokens(profile.industryLabel || profile.industry);

  let score = 20;
  const matchReasons = [];

  const matchedRoleTokens = roleTokens.filter((token) =>
    titleTokens.includes(token)
  );

  if (matchedRoleTokens.length > 0) {
    score += Math.min(40, 18 + matchedRoleTokens.length * 9);
    matchReasons.push(
      `Role match: ${matchedRoleTokens.slice(0, 3).join(", ")}`
    );
  }

  const matchedSkillTokens = skillTokens.filter((token) =>
    titleTokens.includes(token)
  );

  if (matchedSkillTokens.length > 0) {
    score += Math.min(18, matchedSkillTokens.length * 9);
    matchReasons.push(
      `Skills overlap: ${matchedSkillTokens.slice(0, 2).join(", ")}`
    );
  }

  const matchedIndustryTokens = industryTokens.filter((token) =>
    titleTokens.includes(token)
  );

  if (matchedIndustryTokens.length > 0) {
    score += Math.min(12, matchedIndustryTokens.length * 6);
    matchReasons.push(
      `Industry-aligned title: ${matchedIndustryTokens.slice(0, 2).join(", ")}`
    );
  }

  const companyFilter = cleanString(criteria.company).toLowerCase();
  const companyName = cleanString(job.company).toLowerCase();

  if (companyFilter && companyName.includes(companyFilter)) {
    score += 15;
    matchReasons.push(`Company match: ${job.company}`);
  }

  const ageInDays = parseRelativeAge(job.postedAt);

  if (ageInDays !== null) {
    if (ageInDays <= 3) {
      score += 10;
      matchReasons.push("Fresh listing");
    } else if (ageInDays <= 14) {
      score += 6;
    } else if (ageInDays <= 30) {
      score += 2;
    }
  }

  const matchScore = Math.min(99, score);

  let matchLevel = "Worth Reviewing";
  if (matchScore >= 70) {
    matchLevel = "Top Match";
  } else if (matchScore >= 50) {
    matchLevel = "Good Fit";
  }

  if (matchReasons.length === 0) {
    matchReasons.push("Ranked using your search filters and career profile");
  }

  return {
    matchScore,
    matchLevel,
    matchReasons: matchReasons.slice(0, 3),
  };
}
