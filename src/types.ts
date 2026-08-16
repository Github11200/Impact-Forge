import z from "zod"

export const NoteTypes = z.enum(["rough-note", "source-note", "polished-note"])

export const NoteType = z.object({
  noteType: NoteTypes
})

export const NoteTitle = z.object({ title: z.string() })
export const NoteTags = z.object({ tags: z.array(z.string()) })
export const NoteReferences = z.object({ references: z.array(z.string()) })
export const UserQueryResult = z.string()

export type QueryResult = { score: number, text: string, metadata: Record<string, any> }[]