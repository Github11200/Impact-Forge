import type z from "zod";
import type { NoteType, QueryResult } from "./types"
import { noteTypeClassifierAgent } from "./agents/noteTypeClassifierAgent";
import { App, Notice, TFile } from "obsidian";
import VectorDB from "./db";
import { noteTitleAgent } from "./agents/titleAgent";

export default class OrganizationWorkflow {
  app: App
  file: TFile
  noteContent: string
  vectorDB: VectorDB

  constructor(app: App, file: TFile, fileContent: string, vectorDB: VectorDB) {
    this.app = app
    this.file = file
    this.noteContent = fileContent
    this.vectorDB = vectorDB
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

  async getTagName(relevantNotes: QueryResult) {
    // TODO: implement
  }

  async getReferences(relevantNotes: QueryResult) {
    // TODO: Implement
  }

  async updateFileTitle(newTitle: string) {
    // Maintain the existing directory path
    const currentFolder = this.file.parent ? this.file.parent.path : "";
    const extension = this.file.extension ? `.${this.file.extension}` : ".md";

    const newPath = currentFolder
      ? `${currentFolder}/${newTitle}${extension}`
      : `${newTitle}${extension}`;

    try {
      await this.app.fileManager.renameFile(this.file, newPath);
    } catch (error) {
      console.error("Failed to rename file:", error);
      new Notice("Error updating note title");
    }
  }

  async moveFileToFolder(type: string) {

  }

  async run() {
    // GENERATE THE NOTE TITLE
    const newTitle = await this.getTitle()
    if (newTitle === undefined) {
      new Notice("Error generating the title for the document")
      return
    }
    this.updateFileTitle(newTitle)

    // GET THE NOTE TYPE
    const noteType = await this.classifyNote()
    if (typeof noteType === void 0) {
      new Notice("Exiting run dude to classifier agent error")
      return
    }

    // GET THE MOST RELEVANT NOTES TO THE CURRENT ONE
    const queryResult = await this.vectorDB.queryNotes(this.noteContent)

    // DECIDE THE TAG NAME BASED ON THE RELEVANT NOTES
    await this.getTagName(queryResult)

    // DECIDE WHAT OTHER NOTES TO CONNECT TO
    await this.getReferences(queryResult)
  }
}