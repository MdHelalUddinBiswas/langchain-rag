import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { index } from "./pinecone-client";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";

export async function processPDF(file: File) {
  try {
    // Save file temporarily
    const tempDir = join(process.cwd(), 'temp');
    const tempPath = join(tempDir, file.name);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempPath, buffer);

    // Load and split PDF
    const loader = new PDFLoader(tempPath);
    const docs = await loader.load();
    
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splits = await splitter.splitDocuments(docs);

    // Create embeddings and store in Pinecone
    const embeddings = new OpenAIEmbeddings();
    await PineconeStore.fromDocuments(splits, embeddings, {
      pineconeIndex: index,
      namespace: file.name, // Use filename as namespace to separate different PDFs
    });

    // Cleanup
    await unlink(tempPath);
    return { success: true };
  } catch (error) {
    console.error("PDF processing failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
