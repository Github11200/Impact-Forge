import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { providerStrategy, toolStrategy, type ResponseFormat } from "langchain";
import type { ZodObject } from "zod";

export class ModelManager {
  private geminiApiKey: string | null = null

  updateApiKey(newKey: string | null) {
    this.geminiApiKey = newKey
  }

  public getModelAndResponseFormat(temperature: number, type: ZodObject, ollamaModelName?: string): { model: ChatGoogleGenerativeAI | ChatOllama, responseFormat: ResponseFormat } {
    if (this.geminiApiKey) {
      return {
        model: new ChatGoogleGenerativeAI({
          apiKey: this.geminiApiKey,
          model: "gemini-2.5-flash",
          temperature: temperature,
          maxRetries: 2
        }),
        responseFormat: toolStrategy(type)
      }
    }

    return {
      model: new ChatOllama({
        model: ollamaModelName,
        temperature: temperature,
        maxRetries: 2,
        format: type.toJSONSchema()
      }),
      responseFormat: providerStrategy(type)
    }
  }
}

export const modelManager = new ModelManager()