"use client";
import { useState, useRef, useEffect } from "react";

export default function ChatInterface() {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "bot" | "system" }[]
  >([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  console.log("file", file);
  console.log("messages", messages);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setMessages((prev) => [...prev, { text: input, sender: "user" }]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: input,
          history: messages
            .filter((m) => m.sender !== "system")
            .map((m) => m.text),
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.answer) {
        throw new Error("No response received from bot");
      }

      setMessages((prev) => [...prev, { text: data.answer, sender: "bot" }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, something went wrong. Please try again.",
          sender: "system",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          text: data.message || "PDF uploaded and processed successfully!",
          sender: "system",
        },
      ]);
      setFile(null);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text: "Failed to process PDF. Please try again.",
          sender: "system",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="mb-4 p-6 border rounded-lg bg-white shadow-sm">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-3 block w-full text-sm text-gray-700
            file:mr-4 file:py-2.5 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700
            cursor-pointer"
          disabled={isLoading}
        />
        <button
          onClick={handleFileUpload}
          disabled={!file || isLoading}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm"
        >
          {isLoading ? "Processing..." : "Upload PDF"}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto mb-4 border rounded-lg p-4 bg-white shadow-inner">
        {messages.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-xl font-medium text-gray-800">
              Upload a PDF to start chatting
            </p>
            <p className="text-md text-gray-600">
              Ask questions about the document content
            </p>
          </div>
        ) : (
          messages.map((message, i) => (
            <div
              key={i}
              className={`mb-3 p-4 rounded-lg max-w-[80%] shadow-sm ${
                message.sender === "user"
                  ? "bg-blue-600 text-white ml-auto"
                  : message.sender === "bot"
                  ? "bg-white border border-gray-200 text-gray-800 mr-auto"
                  : "bg-yellow-100 text-yellow-800 border border-yellow-200 mx-auto text-center"
              }`}
            >
              {message.text}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-800 placeholder-gray-500"
          placeholder="Ask about the PDF..."
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
