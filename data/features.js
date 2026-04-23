import {
  BrainCircuit,
  Briefcase,
  LineChart,
  MessageSquareText,
  ScrollText,
  Target,
} from "lucide-react";

export const features = [
  {
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
    title: "Career Guidance",
    description: "Clear AI advice for your next move.",
  },
  {
    icon: <Briefcase className="h-8 w-8 text-primary" />,
    title: "Smart Job Search",
    description: "Find stronger-fit roles, faster.",
  },
  {
    icon: <LineChart className="h-8 w-8 text-primary" />,
    title: "Industry Insights",
    description: "Track demand, salaries, and trends.",
  },
  {
    icon: <ScrollText className="h-8 w-8 text-primary" />,
    title: "Cover Letters",
    description: "Generate polished, role-specific drafts.",
  },
  {
    icon: <Target className="h-8 w-8 text-primary" />,
    title: "Interview Prep",
    description: "Practice with focused mock sessions.",
  },
  {
    icon: <MessageSquareText className="h-8 w-8 text-primary" />,
    title: "Career Chat",
    description: "Ask anything in a guided AI workspace.",
  },
];
