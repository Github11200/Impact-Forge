import z from "zod"

export const NoteType = z.object({
  noteType: z.enum(["rough-note", "source-note", "polished-note"])
})

export const NoteTitle = z.string()