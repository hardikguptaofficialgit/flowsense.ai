import { useEffect, useMemo, useRef, useState } from "react";
import { requestChatAgents, requestChatMessage } from "../../api";
import type { ChatAgent, ChatMessage, ChatMessageResponse } from "../../types";

const CHAT_CSS = `
.fs-chatbot-shell {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 120;
  font-family: 'DM Sans', sans-serif;
}

/* TOGGLE */
.fs-chatbot-toggle {
  border: 1px solid rgba(91, 140, 133, 0.2);
  background: linear-gradient(135deg, #e4f2ea 0%, #eef5f7 100%);
  color: #2c3e42;
  border-radius: 999px;
  height: 48px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(91, 140, 133, 0.15);
  transition: all 0.2s ease;
}

.fs-chatbot-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(91, 140, 133, 0.2);
}

/* PANEL */
.fs-chatbot-panel {
  width: min(420px, calc(100vw - 20px));
  height: min(600px, calc(100vh - 80px));
  background: #fcfdfd;
  border: 1px solid rgba(91, 140, 133, 0.1);
  border-radius: 20px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.08);
}

/* HEADER */
.fs-chatbot-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(91, 140, 133, 0.08);
  background: linear-gradient(135deg, rgba(228, 242, 234, 0.4) 0%, rgba(230, 240, 247, 0.4) 100%);
}

.fs-chatbot-title {
  font-size: 15px;
  font-weight: 700;
  color: #2c3e42;
  letter-spacing: -0.2px;
}

.fs-chatbot-sub {
  font-size: 12px;
  color: #799399;
  font-weight: 500;
  margin-top: 2px;
}

.fs-chatbot-close {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #799399;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.fs-chatbot-close:hover {
  color: #2c3e42;
}

/* AGENTS */
.fs-chatbot-agents {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(91, 140, 133, 0.08);
  background: #f6f9f8;
  overflow-x: auto;
}

.fs-chatbot-agents::-webkit-scrollbar {
  height: 4px;
}

.fs-chatbot-agents::-webkit-scrollbar-track {
  background: transparent;
}

.fs-chatbot-agents::-webkit-scrollbar-thumb {
  background: rgba(91, 140, 133, 0.2);
  border-radius: 2px;
}

.fs-chatbot-agent {
  border: 1px solid rgba(91, 140, 133, 0.15);
  background: #ffffff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  color: #526b70;
}

.fs-chatbot-agent:hover {
  border-color: rgba(91, 140, 133, 0.3);
  background: #f6f9f8;
}

.fs-chatbot-agent.active {
  background: #e4f2ea;
  border-color: #82b596;
  color: #2c3e42;
}

/* STREAM */
.fs-chatbot-stream {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fcfdfd;
}

.fs-chatbot-stream::-webkit-scrollbar {
  width: 6px;
}

.fs-chatbot-stream::-webkit-scrollbar-track {
  background: transparent;
}

.fs-chatbot-stream::-webkit-scrollbar-thumb {
  background: rgba(91, 140, 133, 0.2);
  border-radius: 3px;
}

.fs-chatbot-stream::-webkit-scrollbar-thumb:hover {
  background: rgba(91, 140, 133, 0.3);
}

/* MESSAGES */
.fs-chat-bubble {
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.5;
  max-width: 88%;
  word-wrap: break-word;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fs-chat-bubble.user {
  background: linear-gradient(135deg, #5b8c85 0%, #3f6b65 100%);
  color: #ffffff;
  align-self: flex-end;
  border-radius: 14px 4px 14px 14px;
  font-weight: 500;
}

.fs-chat-bubble.assistant {
  background: #ffffff;
  border: 1px solid rgba(91, 140, 133, 0.12);
  color: #2c3e42;
  border-radius: 14px 14px 4px 14px;
  align-self: flex-start;
}

/* INPUT */
.fs-chatbot-composer {
  border-top: 1px solid rgba(91, 140, 133, 0.08);
  padding: 12px;
  background: #f6f9f8;
}

.fs-chatbot-composer-row {
  display: flex;
  gap: 8px;
}

.fs-chatbot-input {
  flex: 1;
  border: 1px solid rgba(91, 140, 133, 0.15);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  background: #ffffff;
  color: #2c3e42;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
}

.fs-chatbot-input:focus {
  border-color: rgba(91, 140, 133, 0.3);
  box-shadow: 0 0 0 3px rgba(91, 140, 133, 0.08);
}

.fs-chatbot-input::placeholder {
  color: #799399;
}

.fs-chatbot-send {
  border: 1px solid rgba(91, 140, 133, 0.2);
  background: #5b8c85;
  color: white;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fs-chatbot-send:hover:not(:disabled) {
  background: #3f6b65;
  transform: translateY(-1px);
}

.fs-chatbot-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* MOBILE */
@media (max-width: 900px) {
  .fs-chatbot-shell {
    right: 10px;
    left: 10px;
    bottom: 10px;
  }

  .fs-chatbot-panel {
    width: 100%;
    height: 70vh;
  }

  .fs-chat-bubble {
    max-width: 92%;
  }
}
`;

let cssInjected = false;
function injectCss() {
  if (cssInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = CHAT_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

function createMessage(role: ChatMessage["role"], text: string, agentId: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    agentId,
    createdAt: new Date().toISOString(),
  };
}

export function FloatingChatbot({ enabled }: { enabled: boolean }) {
  injectCss();

  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState("platform-guide");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    requestChatAgents().then((p) => {
      setAgents(p.agents || []);
    });
  }, [enabled]);

  useEffect(() => {
    if (!open || messages.length) return;
    const welcomeMessages: Record<string, string> = {
      "platform-guide": "How can I help you with FlowSense today? 👋",
      "ux-analyst": "Ready to discuss your UX findings! What questions do you have? 📊",
      "deploy-agent": "Let's talk deployment and quality checks. What's on your mind? 🚀",
      "profile-coach": "Let's optimize your workspace profile. How can I help? 💡",
    };
    setMessages([
      createMessage("assistant", welcomeMessages[activeAgentId] || "How can I help you with FlowSense today? 👋", activeAgentId),
    ]);
  }, [open, activeAgentId]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages]);

  const activeAgent = useMemo(
    () => agents.find(a => a.id === activeAgentId) || agents[0] || null,
    [agents, activeAgentId]
  );

  const submit = async () => {
    if (!input.trim() || loading) return;

    const text = input;
    setMessages(prev => [...prev, createMessage("user", text, activeAgentId)]);
    setInput("");
    setLoading(true);

    try {
      const res: ChatMessageResponse = await requestChatMessage({
        agentId: activeAgentId,
        message: text,
      });

      setMessages(prev => [
        ...prev,
        createMessage("assistant", res.answer, activeAgentId),
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  return (
    <div className="fs-chatbot-shell">
      {open && (
        <div className="fs-chatbot-panel">
          <div className="fs-chatbot-head">
            <div>
              <div className="fs-chatbot-title">FlowSense</div>
              <div className="fs-chatbot-sub">{activeAgent?.name}</div>
            </div>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="fs-chatbot-agents">
            {agents.map(a => (
              <button
                key={a.id}
                className={`fs-chatbot-agent ${a.id === activeAgentId ? "active" : ""}`}
                onClick={() => setActiveAgentId(a.id)}
              >
                {a.name}
              </button>
            ))}
          </div>

          <div className="fs-chatbot-stream" ref={streamRef}>
            {messages.map(m => (
              <div key={m.id} className={`fs-chat-bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="fs-chat-bubble assistant">
                <span style={{ opacity: 0.6 }}>Thinking...</span>
              </div>
            )}
          </div>

          <div className="fs-chatbot-composer">
            <div className="fs-chatbot-composer-row">
              <input
                className="fs-chatbot-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && submit()}
                placeholder="Ask me anything..."
                disabled={loading}
              />
              <button 
                className="fs-chatbot-send"
                onClick={submit} 
                disabled={loading || !input.trim()}
                title={loading ? "Thinking..." : "Send message"}
              >
                {loading ? "..." : "→"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="fs-chatbot-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "Close ✕" : "💬 Ask FlowSense"}
      </button>
    </div>
  );
}