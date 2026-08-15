import { createAgent } from "langchain";
import { NoteTags } from "../types";
import { ChatOllama } from "@langchain/ollama";

const systemPrompt = `You are a Zettelkasten tagging assistant for an Obsidian vault.
Your job is to assign the most accurate tags to a note based on its content and a list of existing candidate tags.

Rules:
1. Prefer selecting tags from the "Existing Candidate Tags" list to maintain vault consistency.
2. If none of the candidate tags fit the note's core topic, you may propose ONE new tag.
3. Keep tags short, lowercase, and formatted for Obsidian (e.g., "artificial-intelligence" or "philosophy").
4. Output MUST strictly match the required JSON schema.
`;

export const tagsAgent = createAgent({
  model: new ChatOllama({
    model: "qwen3:1.7b",
    temperature: 0.1,
    format: "json"
  }),
  name: "Tags Agent",
  description: "An agent that assigns tags to a note.",
  systemPrompt: systemPrompt,
  responseFormat: NoteTags
})