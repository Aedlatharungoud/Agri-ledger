import { useState, useRef, useEffect, type FormEvent } from "react";
import api from "../services/api";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Input,
  PageHeader,
} from "../components/ui";

interface AssistantResponse {
  status: string;
  question: string;
  intent?: string;
  farmer?: {
    farmer_id: number;
    farmer_code: string;
    farmer_name: string;
  };
  answer?: string;
  message?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

const SUGGESTIONS = [
  "How much has Ramesh Kumar realized from crop sales?",
  "Who are the high risk farmers?",
  "What is the outstanding payment balance for Ramesh?",
  "Give me recommendations for Ramesh Kumar",
  "Are there any market deduction anomalies?",
];

export default function AIAssistantPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      message:
        "Namaste! I am your AgriLedger AI Assistant. You can ask me questions about farmer financial positions, mandi realizations, outstanding loan/input balances, credit risk, or operational recommendations.",
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const askAssistant = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;

    setError("");
    const userMsg: ChatMessage = {
      role: "user",
      message: trimmed,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await api.post<AssistantResponse>("/ai/assistant", {
        question: trimmed,
      });

      const data = response.data;
      if (data.status !== "success") {
        throw new Error(data.message || "AgriLedger AI returned an error.");
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        message: data.answer || "I could not locate specific records matching your query.",
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Something went wrong contacting the AgriLedger AI assistant.";
      setError(msg);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: "I encountered an error querying the ledger records. Please verify the question or check database connectivity.",
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    askAssistant(question);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "calc(100vh - 120px)" }}>
      <PageHeader
        title="🤖 AgriLedger AI Assistant"
        description="Conversational intelligence agent trained on your agricultural ledger: inquire about crop realizations, outstanding dues, farmer risk profiles, and seasonal recommendations."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              variant="secondary"
              onClick={() =>
                setMessages([
                  {
                    role: "assistant",
                    message: "Chat session cleared. How can I help you today?",
                    timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                  },
                ])
              }
            >
              Clear Conversation
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Main Chat Container Card */}
      <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <CardBody
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
          }}
        >
          {/* Messages Scroll Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              background: "#F9FAF9",
            }}
          >
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    alignItems: "flex-end",
                    gap: "8px",
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#174D35",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      🤖
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "14px 18px",
                      borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isUser ? "#174D35" : "#FFFFFF",
                      color: isUser ? "#FFFFFF" : "#18251E",
                      border: isUser ? "none" : "1px solid #E2E8F0",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      fontSize: "14px",
                      lineHeight: "1.55",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    <div>{msg.message}</div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: isUser ? "#BCE3C5" : "#A0AEC0",
                        marginTop: "6px",
                        textAlign: isUser ? "right" : "left",
                      }}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {isUser && (
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#EBF5EE",
                        color: "#174D35",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      👤
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#174D35",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  🤖
                </div>
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "12px 18px",
                    borderRadius: "16px",
                    border: "1px solid #E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#718096" }}>
                    Analyzing ledger records...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Prompt Suggestions Bar */}
          <div
            style={{
              padding: "10px 20px",
              background: "#FFFFFF",
              borderTop: "1px solid #EDF2F7",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#718096", textTransform: "uppercase" }}>
              Suggested Queries:
            </span>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => askAssistant(s)}
                disabled={loading}
                style={{
                  background: "#F7FAFC",
                  border: "1px solid #E2E8F0",
                  color: "#174D35",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                💬 {s}
              </button>
            ))}
          </div>

          {/* Input Form Bar */}
          <form
            onSubmit={handleFormSubmit}
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <Input
                placeholder="Ask about a farmer's crop realization, dues, risk, or input advances..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button variant="primary" type="submit" disabled={loading || !question.trim()}>
              {loading ? "Thinking..." : "Send Query ➔"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}