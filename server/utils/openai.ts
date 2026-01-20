import OpenAI from "openai";

// Check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
}

// Get OpenAI client (returns null if not configured)
export function getOpenAIClient(): OpenAI | null {
  if (!isOpenAIConfigured()) {
    return null;
  }

  try {
    return new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  } catch (error) {
    console.warn("OpenAI client initialization failed:", error);
    return null;
  }
}

// Generate AI response (returns null if OpenAI not available)
export async function generateAIResponse(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  systemPrompt?: string
): Promise<string | null> {
  const openai = getOpenAIClient();
  if (!openai) {
    return null;
  }

  try {
    const fullMessages = systemPrompt
      ? [{ role: "system" as const, content: systemPrompt }, ...messages]
      : messages;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using a more standard model
      messages: fullMessages,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null;
  }
}
