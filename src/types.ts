import z from "zod"

export const NoteTypes = z.enum(["rough-note", "source-note", "polished-note"])

export const NoteType = z.object({
  noteType: NoteTypes
})

export const NoteTitle = z.object({ title: z.string() })
export const NoteTags = z.object({ tags: z.array(z.string()) })
export const NoteReferences = z.object({ references: z.array(z.string()) })
export const UserQueryResultSchema = z.object({
  answer: z.string().describe("The comprehensive answer to the user query"),
  references: z.array(z.string()).describe("List of note titles referenced")
});

export type QueryResult = { score: number, text: string, metadata: Record<string, any> }[]

export interface PluginSettings {
  geminiAPIKey: string;
}

export interface ModelConfig {
  geminiApiKey?: string;
  ollamaModelName?: string;
  temperature: number;
}
