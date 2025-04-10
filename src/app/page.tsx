"use client";
import dynamic from "next/dynamic";

// Use dynamic import to avoid hydration issues
const ChatInterface = dynamic(() => import("@/components/ChatInterface"), {
  // ssr: false,
});

export default function Home() {
  return (
    <main className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <h1 className="text-2xl font-bold text-gray-900">PDF Chatbot</h1>
          <p className="text-gray-600">Chat with your documents</p>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </main>
  );
}
