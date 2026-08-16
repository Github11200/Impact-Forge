import { createAgent, providerStrategy } from "langchain";
import { NoteTags } from "../types";
import { ChatOllama } from "@langchain/ollama";
import { modelManager } from "../modelManager";

const systemPrompt = `You are an expert Zettelkasten tagging assistant for an Obsidian vault.
Your goal is to evaluate a note, extract key topics, and output 2 to 4 conceptual tags.

### Decision Workflow:
1. Extract 2-4 core concepts (domains, tools, concepts) from the note content.
2. For each concept:
   - Check if an "Existing Candidate Tag" matches this concept.
   - If a candidate matches, PREFER the candidate tag.
   - If NO candidate fits, create a NEW concise tag.
   - Do not make the tag very vague or very specific, make sure it can be reused elsewhere
3. Keep tags lowercase, hyphen-separated, without special characters or '#' (e.g., "local-models", "machine-learning").

### Example 1:
Note: "Tested using Ollama for automatic note classification. Found that local models need clear taxonomy guidelines."
Candidates: ["zettelkasten", "networking"]
Output: {
  "rationale": "Topic covers Ollama/local models and categorization. 'zettelkasten' doesn't fit directly. Needs 'local-models' and 'note-taking'.",
  "tags": ["local-models", "note-taking", "artificial-intelligence"]
}

### Example 2:
Note: "Guest isolation on routers prevents devices from discovering each other across local networks."
Candidates: ["networking", "hardware", "ai"]
Output: {
  "rationale": "Topic covers router settings and local networking. Candidate 'networking' matches perfectly.",
  "tags": ["networking", "hardware", "security"]
}
`;

export const tagsAgent = createAgent({
  model: modelManager.getModel(0.1, "qwen3:1.7b"),
  name: "Tags Agent",
  description: "An agent that assigns tags to a note.",
  systemPrompt: systemPrompt,
  responseFormat: providerStrategy(NoteTags)
})