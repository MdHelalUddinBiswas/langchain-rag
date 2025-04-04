import * as dotenv from 'dotenv';
dotenv.config();

import { index } from './pinecone-client';
import { OpenAIEmbeddings } from '@langchain/openai';

async function addTestRecord() {
  try {
    const embeddings = new OpenAIEmbeddings();
    
    // Create a test text
    const testText = "This is a test document. It contains some sample text to verify Pinecone integration.";
    
    // Generate embedding for the test text
    const vector = await embeddings.embedQuery(testText);
    
    // Upsert the vector to Pinecone
    await index.upsert([{
      id: 'test-record-1',
      values: vector,
      metadata: {
        text: testText,
        source: 'test'
      }
    }]);
    
    console.log('Test record added successfully!');
    
    // Query to verify
    const queryResponse = await index.query({
      vector: vector,
      topK: 1,
      includeMetadata: true
    });
    
    console.log('Query response:', queryResponse);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
addTestRecord();
