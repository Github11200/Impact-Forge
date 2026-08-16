import type { QueryResult } from "../types";

export default class MarkdownContentMutator {
  static formatWikilinkList(items: string[]): string {
    return items.map((item) => `- ${item}`).join("\n");
  }

  static collectCandidateTags(
    notes: QueryResult,
    getLinksForPath: (path: string) => string[]
  ): Set<string> {
    const candidateTags = new Set<string>();

    for (const note of notes) {
      const links = getLinksForPath(note.metadata.path);
      links.forEach((link) => candidateTags.add(link));
    }

    return candidateTags;
  }

  static applyTags(content: string, tags: string[]): string {
    const formattedTags = tags.map((tag) => `[[${tag}]]`).join(" ");
    const tagsHeaderRegex = /^Tags:[ \t]*/im;

    if (tagsHeaderRegex.test(content)) {
      return content.replace(tagsHeaderRegex, `Tags: ${formattedTags}`);
    }

    return `Tags: ${formattedTags}\n\n${content}`;
  }

  static applyReferences(content: string, references: string[]): string {
    const formattedReferences = this.formatWikilinkList(references);
    const referencesHeadingRegex = /^# References[ \t]*/im;

    if (referencesHeadingRegex.test(content)) {
      return content.replace(
        referencesHeadingRegex,
        `# References\n${formattedReferences}`
      );
    }

    return `${content.trimEnd()}\n\n# References\n${formattedReferences}`;
  }
}
