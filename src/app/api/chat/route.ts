import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { openai } from "@/lib/openai";
import { buildSystemPrompt } from "@/lib/ai-agent/system-prompt";
import { searchKnowledgeBase } from "@/lib/ai-agent/knowledge-base";

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  // Extract the latest user message text for RAG context retrieval
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  const query =
    lastUserMessage?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  // Search the knowledge base for relevant cure approaches
  const relevantContext = searchKnowledgeBase(query);

  // Build the system prompt with RAG context injected
  const systemPrompt = buildSystemPrompt(relevantContext);

  // Convert UI messages to model messages for the LLM
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 1500,
  });

  return result.toUIMessageStreamResponse();
}
