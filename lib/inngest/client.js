import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "career-coach",
  isDev: process.env.NODE_ENV !== "production",
});
