import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';
import { index, truncateEmbeddings } from './pinecone-client';
import OpenAI from 'openai';

// Helper function to log steps
function logStep(step: string, data?: any) {
  console.log(`[PDF] ${step}`, data || '');
}

export interface ProcessPDFResult {
  success: boolean;
  error?: string;
  chunks?: number;
}

export async function processPDF(file: File): Promise<ProcessPDFResult> {
  try {
    logStep('Starting PDF processing', { name: file.name });

    // Convert file to buffer and create blob
    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = new Blob([buffer], { type: file.type });

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
      id: `${file.name.replace(/\s+/g, '-')}-chunk-${i}`, // Replace spaces with hyphens
      values: embedding,
      metadata: {
        text: docs[i].pageContent,
        source: file.name,
        chunk: i,
        type: 'pdf'
      },
    }));

    logStep('Preparing to upsert vectors', { count: vectors.length });

    // Delete existing vectors for this file
    try {
      await index.deleteMany({
        filter: { source: { $eq: file.name } }
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
      chunks: vectors.length
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function queryPDF(question: string): Promise<{ answer: string; success: boolean }> {
  try {
    logStep('Processing question', { question });

    // Check if there are any vectors in the index
    const stats = await index.describeIndexStats();
    logStep('Index stats', stats);

    if (stats.totalRecordCount === 0) {
      return {
        success: true,
        answer: "I don't have any information from the PDF yet. Please upload a PDF document first."
      };
    }

    // Initialize OpenAI embeddings
    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
      stripNewLines: true
    });

    // Generate embedding for the question
    logStep('Generating question embedding');
    const queryEmbedding = await embeddings.embedQuery(question);

    // Truncate embedding to match index dimensions
    const truncatedEmbedding = truncateEmbeddings([queryEmbedding])[0];
    logStep('Embedding dimensions', { length: truncatedEmbedding.length });

    // Query Pinecone
    logStep('Querying Pinecone');
    const queryResponse = await index.query({
      vector: truncatedEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    logStep('Query response', {
      matches: queryResponse.matches?.length || 0,
      firstMatchScore: queryResponse.matches?.[0]?.score
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return {
        success: true,
        answer: "I couldn't find any relevant information in the PDF to answer your question. Please try rephrasing your question."
      };
    }

    // Sort matches by chunk order and format content
    const relevantContent = queryResponse.matches
      .sort((a: any, b: any) => a.metadata.chunk - b.metadata.chunk)
      .map((match: any) => match.metadata.text)
      .join('\n\n');

    logStep('Found relevant content', { chunks: queryResponse.matches.length });

    // Use OpenAI to generate a concise answer
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides concise answers based on the given context. Only answer what is specifically asked and can be supported by the context."
        },
        {
          role: "user",
          content: `Context from PDF:\n${relevantContent}\n\nQuestion: ${question}\n\nProvide a concise answer based only on the context above.`
        }
      ],
      temperature: 0,
      max_tokens: 150
    });

    const answer = response.choices[0]?.message?.content || "I couldn't generate a specific answer from the PDF content.";

    return {
      success: true,
      answer
    };
  } catch (error) {
    console.error('Error querying PDF:', error);
    return {
      success: false,
      answer: error instanceof Error ? error.message : 'Failed to process your question'
    };
  }
}
