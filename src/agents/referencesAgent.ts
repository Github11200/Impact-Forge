import { createAgent, providerStrategy } from "langchain";
import { NoteReferences } from "../types";
import { ChatOllama } from "@langchain/ollama";
import { modelManager } from "../modelManager";

const systemPrompt = `You are an expert Zettelkasten assistant for an Obsidian vault.
Your job is to analyze a new note alongside a set of relevant existing notes and determine which existing notes should be linked as references.

Rules:
1. ONLY recommend links to notes from the provided "Candidate Notes" list. Do NOT invent note titles.
2. Link a note ONLY if there is a direct conceptual relationship, continuation of thought, shared argument, or meaningful contrast (following true Zettelkasten principles).
3. Do NOT link notes if the connection is superficial, weak, or purely coincidental.
4. Output MUST strictly match the required JSON schema containing an array of reference note titles.`;


export function getReferencesAgent() {
  return createAgent({
    model: modelManager.getModel(0.1, "qwen3:4b"),
    name: "References Agent",
    description: "An agent that decides what other notes to interlink to.",
    systemPrompt: systemPrompt,
    responseFormat: providerStrategy(NoteReferences)
  })
}