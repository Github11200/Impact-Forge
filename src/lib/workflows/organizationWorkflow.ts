import type z from "zod";
import type { NoteType, NoteTypes, QueryResult } from "../types"
import { getNoteTypeClassifierAgent } from "../../agents/noteTypeClassifierAgent";
import { App, Notice, TFile } from "obsidian";
import VectorDB from "../services/vectorDB";
import { getTitleAgent } from "../../agents/titleAgent";
import { getTagsAgent } from "../../agents/tagsAgents";
import { getReferencesAgent } from "../../agents/referencesAgent";
import MarkdownContentMutator from "../utils/markdownContentMutator";

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

    // Check what type of note it is if the previous conditions weren't met
    const notesClassifierAgentResult = await getNoteTypeClassifierAgent().invoke({
      messages: [
        { role: "human", content: this.noteContent },
      ],
    })

    try {
      return notesClassifierAgentResult.structuredResponse.noteType
    } catch {
      new Notice("Error parsing classifier agent result")
      return Promise.resolve()
    }
  }

  sanitizeTitle(title: string): string {
    return title
      .replace(/^(\/\/|#+|\s)+/, "") // Remove leading comments or headers
      .replace(/\.md$/i, "")        // Remove trailing extension
      .replace(/[:\\/:*?"<>|]/g, "") // Remove colons and illegal characters
      .replace(/\s+/g, " ")         // Normalize spacing
      .trim();
  }

  async getTitle(): Promise<string> {
    const noteTitleAgentResult = await getTitleAgent().invoke({
      messages: [
        { role: "human", content: this.noteContent }
      ]
    })

    console.log(noteTitleAgentResult)

    try {
      // Sanitize the title to get rid of illegal characters
      const title = this.sanitizeTitle(noteTitleAgentResult.structuredResponse.title)
      return title;
    } catch {
      new Notice("Error generating title")
      return ""
    }
  }

  async updateFileTitle(newTitle: string) {
    // Maintain the existing directory path
    const currentFolder = this.file.parent ? this.file.parent.path : "";
    const extension = this.file.extension ? `.${this.file.extension}` : ".md";

    const newPath = currentFolder
      ? `${currentFolder}/${newTitle}${extension}`
      : `${newTitle}${extension}`;

    console.log("File Path for file title: ", newPath)

    try {
      await this.app.fileManager.renameFile(this.file, newPath);

      const updatedFile = this.app.vault.getAbstractFileByPath(newPath);
      if (updatedFile instanceof TFile) {
        this.file = updatedFile;
      }
    } catch (error) {
      console.error("Failed to rename file:", error);
      new Notice("Error updating note title");
    }
  }

  async moveFileToFolder(noteType: z.infer<typeof NoteTypes>) {
    let folderName: string = "";
    if (noteType === "rough-note")
      folderName = "1 - Rough Notes"
    else if (noteType === "source-note")
      folderName = "2 - Source Material"
    else if (noteType === "polished-note")
      folderName = "3 - Full Notes"

    // Ensure the target path ends properly and includes the filename
    const newPath = `${folderName}/${this.file.name}`
    const oldPath = this.file.path;

    try {
      console.log(`Moving file from ${oldPath} -> ${newPath}`);
      // app.fileManager.renameFile handles both renaming and moving
      await this.app.fileManager.renameFile(this.file, newPath);

      const movedFile = this.app.vault.getAbstractFileByPath(newPath);
      if (movedFile instanceof TFile) {
        this.file = movedFile;
      }
    } catch (error) {
      console.error("Failed to move file:", error);
      new Notice("Error moving file to folder");
    }
  }

  // Update the text file and add the backlinks in
  async updateNoteTags(tags: string[]) {
    const targetFolder = "4 - Tags"

    // Go through all the tags and create the files so you can backlink to them
    for (const tag of tags) {
      const tagFilePath = `${targetFolder}/${tag}.md`;

      // Check if the tag note already exists in the vault
      const existingFile = this.app.vault.getAbstractFileByPath(tagFilePath);

      if (!existingFile) {
        try {
          // Create an empty note for the tag
          await this.app.vault.create(tagFilePath, "");
        } catch (error) {
          console.error(`Failed to create tag file for "${tag}":`, error);
        }
      }
    }

    const updatedContent = MarkdownContentMutator.applyTags(this.noteContent, tags);

    try {
      await this.app.vault.modify(this.file, updatedContent);
      this.noteContent = updatedContent
    } catch (error) {
      console.error("Failed to update tags in note:", error);
      new Notice("Error updating note tags");
    }
  }

  async updateNoteReferences(references: string[]) {
    const updatedContent = MarkdownContentMutator.applyReferences(this.noteContent, references);

    try {
      await this.app.vault.modify(this.file, updatedContent);
      this.noteContent = updatedContent
    } catch (error) {
      console.error("Failed to update references in note:", error);
      new Notice("Error updating note references");
    }
  }

  // As the an agent to generate tag names for this note
  async getTagNames(relevantNotes: QueryResult): Promise<string[]> {
    const candidateTags = MarkdownContentMutator.collectCandidateTags(
      relevantNotes,
      (filePath: string) => {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
          return [];
        }

        const cache = this.app.metadataCache.getFileCache(file);
        const links = cache?.links || [];
        return links.map((link) => link.link);
      }
    );
    const candidateListFormatted = [...candidateTags].length > 0
      ? [...candidateTags].map(tag => `- ${tag}`).join('\n')
      : "None";

    const tagsAgentResult = await getTagsAgent().invoke({
      messages: [
        {
          role: "human",
          content: `Analyze the following note content and assign **1 to 2 broad tags maximum**.

### Note Content:
"""
${this.noteContent}
"""

### Existing Candidate Tags:
${candidateListFormatted || "None"}

### Strict Guidelines:
1. Output at most 2 tags.
2. Keep tags broad and non-specific so they can group dozens of notes together.
3. Prefer candidate tags first before creating new ones.`
        }
      ]
    });

    console.log(tagsAgentResult)
    try {
      return tagsAgentResult.structuredResponse.tags;
    } catch {
      new Notice("Could not extract the tags")
      return []
    }
  }

  async getReferences(relevantNotes: QueryResult): Promise<string[]> {
    // If there are no relevant notes then don't return anything
    if (!relevantNotes || relevantNotes.length === 0)
      return [];

    const candidateListFormatted = relevantNotes.map((doc, idx) => {
      const title = doc.metadata?.title

      // Use the first 300 characters as a preview snippet
      const snippet = doc.text ? doc.text.slice(0, 300).replace(/\s+/g, ' ') : "No preview available";
      return `### Title: "${title}"\nPreview: ${snippet}...`;
    }).join("\n\n");

    const referencesAgentResult = await getReferencesAgent().invoke({
      messages: [
        {
          role: "human", content: `Analyze the following target note and determine which candidate notes from the list should be linked as Zettelkasten references.

          Target Note Content:
          """
          ${this.noteContent}
          """

          Candidate Notes from Vault:
          ${candidateListFormatted}

          Evaluate each candidate. Return ONLY the exact titles of the notes that have a strong conceptual link to the Target Note.`
        }
      ]
    })

    try {
      console.log(referencesAgentResult)
      const references = JSON.parse(referencesAgentResult.messages[1]?.content as string).references
      return references;
    } catch (error) {
      console.log("Error when deciding references: ", error)
      new Notice("Could not get the references")
      return []
    }
  }

  async run() {
    // GENERATE TITLE & RENAME
    new Notice("Generating title...");
    const newTitle = await this.getTitle();
    if (!newTitle) {
      new Notice("Error generating title, aborting...");
      return;
    }
    await this.updateFileTitle(newTitle);
    new Notice("Updated note title");

    // GET THE MOST RELEVANT NOTES TO THE CURRENT ONE
    const queryResult = await this.vectorDB.queryNotes(this.noteContent)
    if (queryResult.length > 0)
      new Notice("Found relevant notes")
    else
      new Notice("No relevant notes found")

    new Notice("Generating tag names...")

    // DECIDE THE TAG NAME BASED ON THE RELEVANT NOTES
    const tagNames = await this.getTagNames(queryResult)
    await this.updateNoteTags(tagNames)

    new Notice("Decided tag names")

    new Notice("Deciding notes to connect to...")

    // DECIDE WHAT OTHER NOTES TO CONNECT TO
    const references = await this.getReferences(queryResult)
    await this.updateNoteReferences(references)

    new Notice("Connected to other notes")

    new Notice("Classifying the note...")

    // GET THE NOTE TYPE
    const noteType = await this.classifyNote()
    if (noteType === void 0) {
      new Notice("Exiting run dude to classifier agent error")
      return
    }
    // @ts-ignore
    await this.moveFileToFolder(noteType.noteType === undefined ? noteType : noteType.noteType)
    new Notice("Classified the note")

    return this.file
  }
}