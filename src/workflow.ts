import type z from "zod";
import type { NoteType } from "./types"
import { noteTypeClassifierAgent } from "./agents/noteTypeClassifierAgent";
import { Notice } from "obsidian";
import VectraClass from "./db";
import { noteTitleAgent } from "./agents/titleAgent";

export default class OrganizationWorkflow {
  noteContent: string
  noteTitle: string = ""

  constructor(fileContent: string) {
    this.noteContent = fileContent
  }

  // Figure out whether the note is source material, a rough note, or a polished note
  async classifyNote(): Promise<z.infer<typeof NoteType> | void> {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const hasLink = urlRegex.test(this.noteContent)

    const wordCount = this.noteContent.trim().split(/\s+/).length

    // If there is a link then it is most probably source material
    if (hasLink) {
      return {
        noteType: "source-note"
      }
    } else if (wordCount < 3) { // If the word count is really small then it is probably still rough
      return {
        noteType: "rough-note"
      }
    }
    console.log("invoking agent...")

    // Check what type of note it is if the previous conditions weren't met
    const notesClassifierAgentResult = await noteTypeClassifierAgent.invoke({
      messages: [
        { role: "human", content: this.noteContent },
      ],
    })

    try {
      const parsedString = JSON.parse(notesClassifierAgentResult.messages[1]?.content as string)
      return parsedString
    } catch {
      new Notice("Error parsing classifier agent result")
      return Promise.resolve()
    }
  }

  async getTitle() {
    const noteTitleAgentResult = await noteTitleAgent.invoke({
      messages: [
        { role: "human", content: this.noteContent }
      ]
    })

    return noteTitleAgentResult.messages[0]?.content as string
  }

  async run() {
    // GENERATE THE NOTE TITLE
    const titleResult = await this.getTitle()
    if (titleResult === undefined) {
      new Notice("Error generating the title for the document")
      return
    }
    this.noteTitle = titleResult

    // GET THE NOTE TYPE
    const noteType = await this.classifyNote()
    if (typeof noteType === void 0) {
      new Notice("Exiting run dude to classifier agent error")
      return
    }

    // GET THE MOST RELAVENT NOTES TO THIS ONE
    const vectra = new VectraClass()
    await vectra.initializeDatabase()
    const queryResult = await vectra.queryNotes(this.noteContent)
  }
}