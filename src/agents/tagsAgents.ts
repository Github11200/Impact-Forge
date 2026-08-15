import { createAgent } from "langchain";
import { NoteTags } from "../types";
import { ChatOllama } from "@langchain/ollama";

const systemPrompt = `You are a Zettelkasten tagging assistant for an Obsidian vault.
Your goal is to assign 2 to 4 conceptual tags that accurately categorize the note.

Tagging Guidelines:
1. Identify the core domains and concepts in the note (e.g., artificial intelligence, networking, note-taking).
2. For each identified topic:
   - Check if an Existing Candidate Tag matches the concept.
   - If a matching candidate exists, USE IT.
   - If NO existing candidate fits a core topic in the note, CREATE A NEW TAG for that topic.
3. Always ensure major foundational subjects (e.g., AI, LLMs, workflow, networking) are tagged if the note discusses them, even if you must create new tags.
4. Formatting: Lowercase, hyphenated (e.g., "local-models"), concise, and no special characters or "#" symbols.

Examples:

Note: "Tested using Ollama for automatic note classification. Found that local models need clear taxonomy guidelines to avoid making overly narrow tags."
Existing Candidates: ["zettelkasten", "networking"]
Output: {"tags": ["zettelkasten", "artificial-intelligence", "local-models"]}

Note: "Guest isolation on routers prevents devices from discovering each other across local networks."
Existing Candidates: ["zettelkasten", "ai"]
Output: {"tags": ["networking", "hardware"]}
`;

export const tagsAgent = createAgent({
  model: new ChatOllama({
    model: "qwen3:4b",
    temperature: 0.1,
    format: "json"
  }),
  name: "Tags Agent",
  description: "An agent that assigns tags to a note.",
  systemPrompt: systemPrompt,
  responseFormat: NoteTags
})