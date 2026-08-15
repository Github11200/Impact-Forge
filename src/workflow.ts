import type z from "zod";
import type { NoteType, NoteTypes, QueryResult } from "./types"
import { noteTypeClassifierAgent } from "./agents/noteTypeClassifierAgent";
import { App, Notice, TFile } from "obsidian";
import VectorDB from "./vectorDB";
import { noteTitleAgent } from "./agents/titleAgent";
import { tagsAgent } from "./agents/tagsAgents";
import { referencesAgent } from "./agents/referencesAgent";

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

  sanitizeTitle(title: string): string {
    return title
      .replace(/^(\/\/|#+|\s)+/, "") // Remove leading comments or headers
      .replace(/\.md$/i, "")        // Remove trailing extension
      .replace(/[:\\/:*?"<>|]/g, "") // Remove colons and illegal characters
      .replace(/\s+/g, " ")         // Normalize spacing
      .trim();
  }

  async getTitle(): Promise<string> {
    const noteTitleAgentResult = await noteTitleAgent.invoke({
      messages: [
        { role: "human", content: this.noteContent }
      ]
    })

    try {
      // Sanitize the title to get rid of illegal characters
      const title = this.sanitizeTitle(JSON.parse(noteTitleAgentResult.messages[1]?.content as string).title)
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

    try {
      // app.fileManager.renameFile handles both renaming and moving
      await this.app.fileManager.renameFile(this.file, newPath);
    } catch (error) {
      console.error("Failed to move file:", error);
      new Notice("Error moving file to folder");
    }
  }

  getTagNamesFromNotes(notes: QueryResult) {
    // Store the tags in a set to avoid duplicates
    const candidateTags = new Set<string>()

    for (const note of notes) {
      const filePath = note.metadata.path;
      const file = this.app.vault.getAbstractFileByPath(filePath);

      if (file instanceof TFile) {
        // Pull internal links directly from Obsidian's internal cache
        const cache = this.app.metadataCache.getFileCache(file);
        const links = cache?.links || [];

        links.forEach(link => candidateTags.add(link.link));
      }
    }

    return candidateTags
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

    // Format the tag strings into Obsidian backlinks
    // ["ai", "philosophy"] -> "[[ai]] [[philosophy]]"
    const formattedTags = tags.map(tag => `[[${tag}]]`).join(" ");

    // Matches "Tags:" along with any trailing spaces/tabs on that same line
    const tagsHeaderRegex = /^Tags:[ \t]*/im;

    let updatedContent: string;

    if (tagsHeaderRegex.test(this.noteContent)) {
      // Replaces just "Tags: " on that line with "Tags: [[tag1]] [[tag2]]"
      updatedContent = this.noteContent.replace(
        tagsHeaderRegex,
        `Tags: ${formattedTags}`
      );
    } else {
      // Fallback if "Tags:" heading doesn't exist
      updatedContent = `Tags: ${formattedTags}\n\n${this.noteContent}`;
    }

    try {
      await this.app.vault.modify(this.file, updatedContent);
      this.noteContent = updatedContent
    } catch (error) {
      console.error("Failed to update tags in note:", error);
      new Notice("Error updating note tags");
    }
  }

  async updateNoteReferences(references: string[]) {
    const formattedReferences = references.map(ref => `- [[${ref}]]`).join("\n");

    // Matches "# References" heading along with anything below that line (to preserve that content)
    const referencesHeadingRegex = /^# References[ \t]*/im;

    let updatedContent: string;

    if (referencesHeadingRegex.test(this.noteContent)) {
      // Inserts the backlinks on a new line directly below "# References"
      updatedContent = this.noteContent.replace(
        referencesHeadingRegex,
        `# References\n${formattedReferences}`
      );
    } else {
      // Fallback: If "# References" heading isn't present, append it to the end of the note
      updatedContent = `${this.noteContent.trimEnd()}\n\n# References\n${formattedReferences}`;
    }

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
    const candidateTags = this.getTagNamesFromNotes(relevantNotes);
    const candidateListFormatted = [...candidateTags].length > 0
      ? [...candidateTags].map(tag => `- ${tag}`).join('\n')
      : "None";

    const tagsAgentResult = await tagsAgent.invoke({
      messages: [
        {
          role: "human",
          content: `Analyze the note content below and assign 2-4 tags covering both the main subject matter/tools discussed and the broader domain.

Note Content:
"""
${this.noteContent}
"""

Existing Candidate Tags from Similar Notes:
${candidateListFormatted}

Instructions:
- Compare the core concepts of the note against the Existing Candidates list.
- Use candidate tags where relevant.
- CREATE NEW TAGS for key subjects or technologies (like AI, LLMs, or prompt-engineering) if they are missing from the candidates list.`
        }
      ]
    });

    try {
      const tags = JSON.parse(tagsAgentResult.messages[1]?.content as string).tags
      return tags;
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

    const referencesAgentResult = await referencesAgent.invoke({
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
    // GET THE MOST RELEVANT NOTES TO THE CURRENT ONE
    const queryResult = await this.vectorDB.queryNotes(this.noteContent)
    new Notice("Found relevant notes")

    console.log(queryResult)

    // DECIDE THE TAG NAME BASED ON THE RELEVANT NOTES
    const tagNames = await this.getTagNames(queryResult)
    await this.updateNoteTags(tagNames)

    new Notice("Decided tag names")

    // DECIDE WHAT OTHER NOTES TO CONNECT TO
    const references = await this.getReferences(queryResult)
    await this.updateNoteReferences(references)

    new Notice("Connected to other notes")

    // GENERATE THE NOTE TITLE
    const newTitle = await this.getTitle()
    if (newTitle === undefined) {
      new Notice("Error generating the title for the document")
      return
    }
    await this.updateFileTitle(newTitle)
    new Notice("Generated the title")

    // GET THE NOTE TYPE
    const noteType = await this.classifyNote()
    if (noteType === void 0) {
      new Notice("Exiting run dude to classifier agent error")
      return
    }
    await this.moveFileToFolder(noteType.noteType)
    new Notice("Classified the note")

    return this.file
  }
}