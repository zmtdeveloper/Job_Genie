export const JOB_TABS = {
  TOP: "top",
  RECENT: "recent",
  REMOTE: "remote",
  SAVED: "saved",
};

export const JOB_PROVIDER_OPTIONS = [
  {
    value: "linkedin",
    label: "LinkedIn",
  },
  {
    value: "indeed",
    label: "Indeed",
  },
];

export const JOB_MARKET_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "au", label: "Australia" },
  { value: "in", label: "India" },
];

export const JOB_MARKET_LABELS = Object.fromEntries(
  JOB_MARKET_OPTIONS.map((option) => [option.value, option.label])
);

export const JOB_APPLICATION_STATUSES = [
  {
    value: "saved",
    label: "Saved",
    description: "Bookmarked and ready for follow-up.",
  },
  {
    value: "applied",
    label: "Applied",
    description: "Application has been submitted.",
  },
  {
    value: "interviewing",
    label: "Interviewing",
    description: "Currently in an interview stage.",
  },
  {
    value: "offer",
    label: "Offer",
    description: "Offer received or under review.",
  },
  {
    value: "archived",
    label: "Archived",
    description: "Not active, but kept for reference.",
  },
];

export const DEFAULT_JOB_STATUS = JOB_APPLICATION_STATUSES[0].value;
