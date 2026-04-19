export const CHAT_MODES = [
  {
    id: "career-coach",
    label: "Career Coach",
    description: "Big-picture career direction, positioning, and next steps.",
    emptyPrompts: [
      "Based on my profile, what should I focus on in the next 30 days?",
      "What are the strongest roles for me right now?",
      "How should I position myself better in this market?",
    ],
  },
  {
    id: "resume-reviewer",
    label: "Resume Reviewer",
    description: "Sharper resume feedback, ATS advice, and stronger wording.",
    emptyPrompts: [
      "What are the biggest resume gaps holding me back?",
      "Which keywords am I missing for my target roles?",
      "Give me 3 resume improvements with the highest impact.",
    ],
  },
  {
    id: "job-strategist",
    label: "Job Strategist",
    description: "Job selection, tracker strategy, and application planning.",
    emptyPrompts: [
      "Which of my saved jobs should I prioritize first?",
      "What is the best next move for my tracked applications?",
      "Help me decide which role is worth applying to today.",
    ],
  },
  {
    id: "interview-coach",
    label: "Interview Coach",
    description: "Interview preparation, likely questions, and follow-up strategy.",
    emptyPrompts: [
      "What questions should I expect for my target role?",
      "How do I improve based on my latest assessment results?",
      "Create a focused interview prep plan for this week.",
    ],
  },
];

export const CHAT_SCOPE_TYPES = {
  GENERAL: "general",
  JOB: "job",
  COMPANY: "company",
  INTERVIEW: "interview",
};

export const CHAT_ACTION_TYPES = {
  SAVE_JOB: "save_job",
  MOVE_TO_APPLIED: "move_to_applied",
  GENERATE_COVER_LETTER: "generate_cover_letter",
  PREPARE_INTERVIEW: "prepare_interview",
  ADD_TRACKER_NOTE: "add_tracker_note",
};

export const CHAT_ACTION_LABELS = {
  [CHAT_ACTION_TYPES.SAVE_JOB]: "Save This Job",
  [CHAT_ACTION_TYPES.MOVE_TO_APPLIED]: "Move To Applied",
  [CHAT_ACTION_TYPES.GENERATE_COVER_LETTER]: "Generate Cover Letter",
  [CHAT_ACTION_TYPES.PREPARE_INTERVIEW]: "Prepare Interview",
  [CHAT_ACTION_TYPES.ADD_TRACKER_NOTE]: "Add Tracker Note",
};
