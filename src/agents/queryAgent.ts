import { createAgent, providerStrategy } from "langchain";
import { NoteReferences, UserQueryResult } from "../types";
import { ChatOllama } from "@langchain/ollama";

const systemPrompt = `You are an expert research assistant for an Obsidian Zettelkasten vault. Your task is to answer the user's query comprehensively and accurately using ONLY the provided context notes retrieved from the user's graph database.

Rules & Guidelines:
1. Grounded Answers: Base your response strictly on the information found within the provided context notes. Do not assume or extrapolate beyond what is supported by the context.
2. Citation & Linking: Whenever you draw information from a specific note, cite it using Obsidian double-bracket link format (e.g., [[Note Title]]).
3. Acknowledge Gaps: If the provided context notes do not contain sufficient information to answer the user's query fully, explicitly state what information is missing based on the available notes.
4. Synthesis: Synthesize insights across multiple notes when applicable to provide a cohesive, well-organized answer rather than just summarizing notes individually.`;


export const queryAgent = createAgent({
  model: new ChatOllama({
    model: "qwen3:4b",
    temperature: 0.1,
    format: UserQueryResult.toJSONSchema()
  }),
  name: "Query Agent",
  description: "An agent that answers queries about the notes database.",
  systemPrompt: systemPrompt,
  responseFormat: providerStrategy(UserQueryResult)
});