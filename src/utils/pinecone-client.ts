import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
  throw new Error('Pinecone API key or index name not set');
}

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// Get index instance
const index = pc.index(process.env.PINECONE_INDEX_NAME);

// Helper function to truncate embeddings to 1024 dimensions
export function truncateEmbedding(embedding: number[]): number[] {
  return embedding.slice(0, 1024);
}

// Helper function to truncate multiple embeddings
export function truncateEmbeddings(embeddings: number[][]): number[][] {
  return embeddings.map(embedding => truncateEmbedding(embedding));
}

export { pc, index };
