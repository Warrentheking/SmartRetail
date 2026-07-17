import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Bot } from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";

const SUGGESTED_QUESTIONS = [
  "How much did I make this week?",
  "What should I restock today?",
  "Who are my top customers?",
  "How does this month compare to last month?",
];

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendQuestion(question) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/assistant/ask", { question: trimmed });
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch (err) {
      const detail = err.response?.data?.detail || "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: detail, isError: true }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendQuestion(input);
  }

  return (
    <AppShell title="Ask AI" subtitle="Plain-English answers about your business, powered by Gemini">
      <div className="flex flex-col h-[calc(100vh-140px)] max-w-3xl mx-auto">
        {messages.length === 0 && (
          <div className="shrink-0 mb-4">
            <p className="text-sm text-gray-500 mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuestion(q)}
                  className="text-sm bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors shadow-card"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-7 h-7" strokeWidth={1.75} />
                </div>
                <p className="text-sm text-gray-400">Ask a question about your business in plain English.</p>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" strokeWidth={2} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : m.isError
                      ? "bg-red-50 text-red-600 border border-red-100 rounded-bl-md"
                      : "bg-white border border-gray-150 shadow-card text-gray-800 rounded-bl-md"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="bg-white border border-gray-150 shadow-card text-gray-400 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about revenue, stock, customers..."
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm shadow-card"
          >
            <Send className="w-4 h-4" strokeWidth={2} />
            Send
          </button>
        </form>
      </div>
    </AppShell>
  );
}
