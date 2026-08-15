import z from "zod"

export const NoteType = z.object({
  noteType: z.enum(["rough-note", "source-note", "polished-note"])
})

export const NoteTitle = z.string()


export type QueryResult = { score: number, text: string, metadata: Record<string, any> }[]