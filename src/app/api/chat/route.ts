import { NextResponse } from 'next/server';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OpenAI } from '@langchain/openai';
import { loadQAStuffChain } from 'langchain/chains';
import { Document } from 'langchain/document';
import { index, truncateEmbedding } from '@/utils/pinecone-client';

// Helper function to format documents
function formatDocumentsAsString(docs: any[]): string {
  return docs.map(doc => doc.pageContent).join('\n\n');
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    console.log('[Chat] Processing question:', question);

    // First, check if there are any vectors in the index
    const stats = await index.describeIndexStats();
    console.log('[Chat] Index stats:', stats);

    if (stats.totalRecordCount === 0) {
      console.log('[Chat] No vectors found in index');
      return NextResponse.json({
        answer: "I don't have any information from the PDF yet. Please upload a PDF document first."
      });
    }

    // Initialize OpenAI embeddings
    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
      stripNewLines: true
    });

    // Generate embedding for the question
    console.log('[Chat] Generating question embedding...');
    const queryEmbedding = await embeddings.embedQuery(question);

    // Truncate embedding to match index dimensions
    const truncatedEmbedding = truncateEmbedding(queryEmbedding);
    console.log('[Chat] Embedding dimensions:', truncatedEmbedding.length);

    // Query Pinecone directly
    console.log('[Chat] Querying Pinecone...');
    const queryResponse = await index.query({
      vector: truncatedEmbedding,
      topK: 5, // Increased from 3 to 5 for better context
      includeMetadata: true,
    });

    console.log('[Chat] Query response:', {
      matches: queryResponse.matches?.length || 0,
      firstMatchScore: queryResponse.matches?.[0]?.score
    });

    // Check if any matches were found
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      console.log('[Chat] No matches found in Pinecone');
      return NextResponse.json({
        answer: "I couldn't find any relevant information in the PDF to answer your question. Please try rephrasing your question or upload a different PDF."
      });
    }

    // Convert matches to documents and sort by chunk order
    const docs = queryResponse.matches
      .map((match: any) => ({
        pageContent: match.metadata.text,
        metadata: {
          ...match.metadata,
          score: match.score
        }
      }))
      .sort((a: any, b: any) => a.metadata.chunk - b.metadata.chunk)
      .map((doc: any) => new Document(doc));

    console.log('[Chat] Found relevant chunks:', {
      count: docs.length,
      chunks: docs.map((d: any) => d.metadata.chunk).join(', ')
    });

    // Initialize OpenAI model
    const model = new OpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0
    });

    // Load QA chain
    const chain = loadQAStuffChain(model);

    // Run the chain
    console.log('[Chat] Generating answer...');
    const result = await chain.call({
      input_documents: docs,
      question: question,
    });

    console.log('[Chat] Answer generated successfully');
    return NextResponse.json({
      answer: result.text,
      success: true
    });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process your question',
        success: false
      },
      { status: 500 }
    );
  }
}
