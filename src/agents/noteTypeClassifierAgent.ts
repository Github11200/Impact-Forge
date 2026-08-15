import { createAgent } from "langchain";
import { NoteType } from "../types";
import { ChatOllama } from "@langchain/ollama";

const systemPrompt = `You are a strict note classification agent. Classify the input note into exactly one of three categories based on these definitions:

1. 'rough-note': Fragmentary, unrefined, or mixed ideas, to-do lists, fleeting thoughts, brainstorms, or some experience.
2. 'source-note': Direct quotes, summaries, or paraphrases primarily attributing ideas, data, or arguments to external authors or literature.
3. 'polished-note': Well-structured, standalone, atomic concepts articulated in your own words, explaining a single principle, mental model, or insight clearly without relying on an external quote.

Examples:
Input: "Remember to look into quantum computing next week. Also buy milk."
Output: {"noteType": "rough-note"}

Input: "According to Ahrens (2017), writing notes is the engine of research, not just the output."
Output: {"noteType": "source-note"}

Input: "Working memory has a strict 3-4 item limit. Externalizing thoughts onto paper offloads storage from the brain, reducing cognitive load and allowing for deeper analysis."
Output: {"noteType": "polished-note"}

Return only valid JSON matching the requested format.`

export const noteTypeClassifierAgent = createAgent({
  model: new ChatOllama({
    model: "qwen3:1.7b",
    temperature: 0.1,
    format: "json"
  }),
  name: "Atomic Notes Agent",
  description: "An agent that takes a note and splits it into atomic notes.",
  systemPrompt: systemPrompt,
  responseFormat: NoteType
})