import { Notice } from "obsidian";


type QueryResult = { score: number, text: string }[]

export default class VectraClass {
  index: LocalDocumentIndex | undefined

  async initializeDatabase() {
    const pc = new Pinecone({ apiKey: 'YOUR_API_KEY' });

    // const embeddings = await TransformersEmbeddings.create();
    // console.log(TransformersEmbeddings)
    // this.index = new LocalDocumentIndex({foldrePath: path.join(process.cwd(), 'my-index')}, embeddings);

    // const isCreated = await this.index.isIndexCreated()

    // if (!isCreated) {
    //   await this.index.createIndex({
    //     version: 1,
    //   })
    // }
  }

  // async queryNotes(document: string): Promise<QueryResult> {
  //   const results = await this.index?.queryDocuments(document, {
  //     maxDocuments: 5,
  //     maxChunks: 20
  //   })

  //   if (results === undefined) {
  //     new Notice("There were no matching documents")
  //     return []
  //   }

  //   let queryResult: QueryResult = []
  //   for (const result of results) {
  //     const sections = await result.renderSections(2000, 1, false)

  //     for (const section of sections) {
  //       queryResult.push({
  //         text: section.text,
  //         score: section.score,
  //       })
  //     }
  //   }

  //   return queryResult
  // }

  // async addDocument(document: string, name: string) {
  //   await this.index?.upsertDocument(`doc://${name}`, document, "md")
  // }
}