"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: userMessage }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error processing your request.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `PDF uploaded and processed successfully! Created ${data.chunks} chunks.` },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Error processing PDF: ${data.error}` },
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error uploading the PDF.' },
      ]);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProcessLocalPDFs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/process-local-pdfs', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Successfully processed ${data.results.filter((r: any) => r.success).length} PDFs from the local folder.` },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Error processing local PDFs: ${data.error}` },
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error processing local PDFs.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[90vh] max-w-5xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {message.role === 'user' 
                  ? message.content 
                  : message.content.split('\n').filter(line => 
                      !line.includes('Pages vs components') && 
                      !line.trim().startsWith('my-next-app/') &&
                      !line.includes('Step 1 Create') &&
                      !line.includes('Step 2 Create')
                    ).join('\n')}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="p-4 rounded-lg bg-gray-100 animate-pulse">
            <p>Loading...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-4 mt-4">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
          ref={fileInputRef}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          disabled={isLoading}
        >
          Upload PDF
        </button>

        <button
          onClick={handleProcessLocalPDFs}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          disabled={isLoading}
        >
          Process Local PDFs
        </button>

        <form onSubmit={handleSubmit} className="flex-1 flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the PDF..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
