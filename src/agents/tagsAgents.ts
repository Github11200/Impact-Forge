import { createAgent, providerStrategy, toolStrategy, type ResponseFormat } from "langchain";
import { NoteTags } from "../types";
import { ChatOllama } from "@langchain/ollama";
import { modelManager } from "../modelManager";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const systemPrompt = `You are an expert Zettelkasten tagging assistant for an Obsidian vault.
Your goal is to evaluate a note and output ONLY 1 or 2 high-level, broadly reusable tags.

### Tagging Rules:
1. Max Limit: Output **1 or 2 tags maximum**. Never output 3 or more.
2. High-Level Granularity: Use broad, main-topic categories (e.g., "nextjs", "typescript", "devops", "networking").
3. Avoid Niche Tags: DO NOT combine terms or create specific sub-topic tags like "nextjs-configuration", "typescript-linting", or "build-process". Ask yourself: "Will this tag apply to at least 20 other notes?"
4. Reuse Candidates: Always prefer an "Existing Candidate Tag" if it matches the general domain.
5. Formatting: Keep tags lowercase, single words or simple compound words separated by hyphens, without special characters or '#'.

### Example 1:
Note: "Add ignoreBuildErrors: true to next.config.ts to ignore TS errors on build."
Candidates: ["nextjs", "web-development"]
Output: {
  "rationale": "Note is about Next.js and TypeScript settings. 'nextjs' is a candidate tag, and 'typescript' is a broad topic.",
  "tags": ["nextjs", "typescript"]
}

### Example 2:
Note: "Tested using Ollama for automatic note classification. Found local models need guidelines."
Candidates: ["zettelkasten", "ai"]
Output: {
  "rationale": "Note touches local LLMs and note management. 'ai' is a candidate tag.",
  "tags": ["ai", "zettelkasten"]
}
`;

export function getTagsAgent() {
  const { model, responseFormat } = modelManager.getModelAndResponseFormat(0.1, NoteTags, "qwen3:1.7b")

  return createAgent({
    model: model,
    name: "Tags Agent",
    description: "An agent that assigns tags to a note.",
    systemPrompt: systemPrompt,
    responseFormat: providerStrategy(NoteTags)
  })
}