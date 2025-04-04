import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';
import { index, truncateEmbeddings } from './pinecone-client';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Helper function to log steps
function logStep(step: string, data?: any) {
  console.log(`[LocalPDF] ${step}`, data || '');
}

export interface ProcessLocalPDFResult {
  success: boolean;
  error?: string;
  fileName?: string;
  chunks?: number;
}

export async function processLocalPDF(pdfPath: string): Promise<ProcessLocalPDFResult> {
  try {
    logStep('Starting local PDF processing', { path: pdfPath });

    // Read the PDF file
    const buffer = await readFile(pdfPath);
    const fileName = pdfPath.split('\\').pop() || 'unknown.pdf';

    // Create a blob from the buffer
    const blob = new Blob([buffer], { type: 'application/pdf' });

    // Load the PDF
    logStep('Loading PDF');
    const loader = new PDFLoader(blob);
    const document = await loader.load();
    logStep('PDF loaded successfully', { pages: document.length });

    // Split the document into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(document);
    logStep('Split into chunks', { chunks: docs.length });

    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
      stripNewLines: true
    });

    logStep('Generating embeddings');
    // Generate embeddings for all chunks
    const fullEmbeddings = await embeddings.embedDocuments(
      docs.map(doc => doc.pageContent)
    );

    // Truncate embeddings to match index dimensions
    const truncatedEmbeddings = truncateEmbeddings(fullEmbeddings);
    logStep('Embeddings generated and truncated', {
      original: fullEmbeddings[0].length,
      truncated: truncatedEmbeddings[0].length
    });

    // Create vectors with truncated embeddings
    const vectors = truncatedEmbeddings.map((embedding: number[], i: number) => ({
      id: `${fileName.replace(/\\s+/g, '-')}-chunk-${i}`, // Replace spaces with hyphens
      values: embedding,
      metadata: {
        text: docs[i].pageContent,
        source: fileName,
        chunk: i,
        type: 'pdf'
      },
    }));

    logStep('Preparing to upsert vectors', { count: vectors.length });

    // Delete existing vectors for this file
    try {
      await index.deleteMany({
        filter: { source: { $eq: fileName } }
      });
      logStep('Deleted existing vectors');
    } catch (e) {
      logStep('No existing vectors to delete');
    }

    // Batch upsert vectors in groups of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      logStep(`Upserted batch ${i / batchSize + 1}`, { size: batch.length });
    }

    logStep('All vectors upserted successfully');

    return {
      success: true,
      fileName,
      chunks: vectors.length
    };
  } catch (error) {
    console.error('Error processing local PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function processAllPDFsInFolder(folderPath: string): Promise<ProcessLocalPDFResult[]> {
  try {
    logStep('Reading PDFs from folder', { path: folderPath });
    
    // Read all files in the directory
    const files = await readdir(folderPath);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    logStep('Found PDF files', { count: pdfFiles.length, files: pdfFiles });

    if (pdfFiles.length === 0) {
      return [{
        success: false,
        error: 'No PDF files found in the specified folder'
      }];
    }

    // Process each PDF file
    const results = [];
    for (const pdfFile of pdfFiles) {
      const fullPath = join(folderPath, pdfFile);
      const result = await processLocalPDF(fullPath);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Error processing PDFs in folder:', error);
    return [{
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
}
