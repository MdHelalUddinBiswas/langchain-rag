import { NextResponse } from 'next/server';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { index, truncateEmbeddings } from '@/utils/pinecone-client';

// Helper function to log steps
function logStep(step: string, data?: any) {
  console.log(`[Upload] ${step}`, data || '');
}

export async function POST(req: Request) {
  try {
    logStep('Starting PDF upload');
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file received.' },
        { status: 400 }
      );
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Please upload a PDF file.' },
        { status: 400 }
      );
    }

    logStep('Converting file to buffer');
    // Convert the file to a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create a blob from the buffer
    const blob = new Blob([buffer], { type: file.type });

    logStep('Loading PDF');
    // Load the PDF
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

    return NextResponse.json(
      {
        message: `PDF processed successfully. Created ${vectors.length} chunks.`,
        success: true,
        chunks: vectors.length
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    logStep('Error', error.message);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process PDF',
        success: false
      },
      { status: 500 }
    );
  }
}
