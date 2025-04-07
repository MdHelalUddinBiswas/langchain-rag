# PDF Chat with LangChain and Next.js

This is an AI-powered PDF chat application built with Next.js, LangChain, OpenAI, and Pinecone. Upload PDF documents and ask questions to get relevant answers from the content.

## Features

- PDF document upload and processing
- Natural language querying of PDF content
- Efficient vector search using Pinecone
- Clean and responsive chat interface
- Real-time answer generation using OpenAI

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- OpenAI API key
- Pinecone account and API key

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/langchain-ai-chat.git
   cd langchain-ai-chat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `env.example` to `.env`
   - Fill in your API keys and configuration:
     ```env
     OPENAI_API_KEY=your_openai_api_key_here
     PINECONE_API_KEY=your_pinecone_api_key_here
     PINECONE_INDEX_NAME=your_pinecone_index_name
     ```

4. Create a Pinecone index:
   - Log in to your Pinecone dashboard
   - Create a new index with:
     - Dimensions: 1536 (for OpenAI embeddings)
     - Metric: Cosine
   - Note down the index name and environment

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Upload a PDF document using the upload button
2. Wait for the document to be processed
3. Ask questions about the document content
4. Receive AI-generated answers based on the document

## Technology Stack

- [Next.js](https://nextjs.org/) - React framework
- [LangChain](https://js.langchain.com/) - LLM framework
- [OpenAI](https://openai.com/) - AI model provider
- [Pinecone](https://www.pinecone.io/) - Vector database
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Project Structure

```
langchain-ai-chat/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   └── utils/            # Utility functions
├── public/              # Static assets
└── ...config files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
