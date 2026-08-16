import { createAgent, providerStrategy } from "langchain";
import { NoteTitle } from "../types"; // Schema defining the output structure, e.g., { title: string }
import { ChatOllama } from "@langchain/ollama";
import { modelManager } from "../modelManager";

const systemPrompt = `You are a Zettelkasten titling agent. Your job is to create a clear, concise, and declarative title for an atomic note based on its content.

Guidelines:
1. Make the title a strong, declarative statement or clear concept that captures the core insight.
2. Avoid generic labels (e.g., DO NOT use "Cognitive Load", USE "Externalizing thoughts reduces cognitive load").
3. Keep it brief (typically 3–8 words).
4. Strictly NO illegal file system characters: Do not include slashes (/ or \\), colons (:), angle brackets (< or >), pipe symbols (|), question marks (?), asterisks (*), or double quotes (").
5. Do not include file extensions (e.g., do NOT add .md at the end).
6. Do not include comment markers, markdown header symbols (#), quotes, or conversational filler.

Examples:
Input: "Working memory has a strict 3-4 item limit. Externalizing thoughts onto paper offloads storage from the brain, reducing cognitive load and allowing for deeper analysis."
Output: {"title": "Externalizing Thoughts Reduces Cognitive Load"}

Input: "There are three main note types: Fleeting, Literature, and Permanent notes, each serving a distinct purpose in the workflow."
Output: {"title": "Three Distinct Note Types - Fleeting Literature Permanent"}

Return only valid JSON matching the requested format.`;

export function getTitleAgent() {
  const { model, responseFormat } = modelManager.getModelAndResponseFormat(0.1, NoteTitle, "qwen3:1.7b")

  return createAgent({
    model: model,
    name: "Note Title Agent",
    description: "An agent that generates a concise, declarative Zettelkasten title for a given note.",
    systemPrompt: systemPrompt,
    responseFormat: responseFormat,
  })
}