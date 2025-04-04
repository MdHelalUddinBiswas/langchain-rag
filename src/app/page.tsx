'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Use dynamic import to avoid hydration issues
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false
});

interface Message {
  text: string;
  isUser: boolean;
  error?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [input, setInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsUploading(true);
      setUploadError(null);
      const file = acceptedFiles[0];
      
      if (!file.type.includes('pdf')) {
        throw new Error('Please upload a PDF file');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      console.log('Upload response:', data);
      if (!response.ok) {
        throw new Error(data.error || 'Error uploading PDF');
      }
      
      setMessages(prev => [...prev, { 
        text: `PDF "${file.name}" uploaded and processed successfully! You can now ask questions about it.`, 
        isUser: false 
      }]);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadError(error.message);
      setMessages(prev => [...prev, { 
        text: error.message || 'Error uploading PDF. Please try again.', 
        isUser: false,
        error: true
      }]);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please try again.');
      }

      const data = await response.json();
      
      console.log('Chat response:', data);
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, { 
        text: data.answer,
        isUser: false 
      }]);
    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        text: error.message || 'Error occurred. Please try again.',
        isUser: false,
        error: true
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <h1 className="text-2xl font-bold text-gray-900">PDF Chatbot</h1>
          <p className="text-gray-600">Chat with your documents</p>
        </div>
      </header>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <ChatInterface />
      </div>
    </main>
  );
}
