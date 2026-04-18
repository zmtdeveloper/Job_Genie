import { generateText } from "@/lib/gemini";

export async function POST(req) {
  try {
    // 1. API Key Check (Server side par console check karein)
    if (!process.env.GEMINI_API_KEY) {
      console.error("ERROR: GEMINI_API_KEY missing in .env");
      return Response.json({ reply: "Configuration Error: API Key not found." }, { status: 500 });
    }

    const body = await req.json();
    const { message } = body;

    // 2. Message Validation
    if (!message) {
      return Response.json({ reply: "Please type something first!" }, { status: 400 });
    }

    const prompt = `
Role: You are a world-class Career Mentor, trusted advisor, and market strategist.

STRICT STYLE RULES:
1. NO INTROS/OUTROS: Start immediately with actionable advice.
2. HUMAN-LIKE FLOW: Write as if sending a WhatsApp or Slack message. Short, punchy sentences.
3. NO BULLETS: Use simple paragraphs. Number items only if necessary.
4. OPINIONATED & DECISIVE: Give exactly what the user should do RIGHT NOW based on current trends.
5. SHOW, DON'T TELL: Give concrete steps. Instead of "Learn Python," say "Build 3 projects in Python, push them on GitHub, and share your code daily."
6. CONTEXT-AWARE: Reference user's previous questions or messages when possible.
7. MOTIVATE: Encourage, inspire, but keep it realistic and grounded.
8. MAX 120 WORDS: Concise, no robotic formatting, no repetition.

User Message: ${message}

Response: Provide direct, practical, and step-by-step guidance tailored for a career boost. Avoid fluff, generic advice, or repeating the question.
`;

    // 3. Generating Content
    const text = await generateText({
      prompt,
      model: "gemini-2.5-flash",
    });

    return Response.json({ reply: text });

  } catch (error) {
    // Terminal (VScode) mein ye error check karein
    console.error("CHATBOT_ROUTE_ERROR:", error);

    return Response.json({ 
      reply: "Technical Error: " + (error.message || "Something went wrong") 
    }, { status: 500 });
  }
}
