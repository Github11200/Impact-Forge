import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { ModelConfig } from "./types";
import { ChatOllama } from "@langchain/ollama";

export class ModelManager {
  private geminiApiKey: string | null = null

  updateApiKey(newKey: string | null) {
    this.geminiApiKey = newKey
  }

  public getModel(temperature: number, ollamaModelName?: string): ChatGoogleGenerativeAI | ChatOllama {
    if (this.geminiApiKey) {
      return new ChatGoogleGenerativeAI({
        apiKey: this.geminiApiKey,
        model: "gemini-2.5-flash",
        temperature: temperature,
      });
    }

    return new ChatOllama({
      model: ollamaModelName,
      temperature: temperature,
    });
  }
}

export const modelManager = new ModelManager()