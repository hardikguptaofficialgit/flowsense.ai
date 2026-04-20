import { useEffect, useMemo, useRef, useState } from "react";
import { requestChatAgents, requestChatMessage } from "../../api";
import type { ChatAgent, ChatMessage, ChatMessageResponse, ProviderStatus } from "../../types";

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
  border: 1px solid rgba(0,0,0,0.08);
  background: #f6faf8;
  color: #1e2e30;
  border-radius: 999px;
  height: 44px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* PANEL */
.fs-chatbot-panel {
  width: min(380px, calc(100vw - 20px));
  height: min(560px, calc(100vh - 80px));
  background: #f8fbf9;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 16px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  overflow: hidden;
  margin-bottom: 10px;
}

/* HEADER */
.fs-chatbot-head {
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.fs-chatbot-title {
  font-size: 14px;
  font-weight: 700;
}

.fs-chatbot-sub {
  font-size: 11px;
  color: #6b7c80;
}

.fs-chatbot-close {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

/* AGENTS */
.fs-chatbot-agents {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.fs-chatbot-agent {
  border: 1px solid rgba(0,0,0,0.08);
  background: #ffffff;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  cursor: pointer;
}

.fs-chatbot-agent.active {
  background: #e3efe8;
  border-color: #e3efe8;
}

/* STREAM */
.fs-chatbot-stream {
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* MESSAGES */
.fs-chat-bubble {
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.4;
  max-width: 85%;
}

.fs-chat-bubble.user {
  background: #d9ecf5;
  align-self: flex-end;
}

.fs-chat-bubble.assistant {
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.06);
}

/* INPUT */
.fs-chatbot-composer {
  border-top: 1px solid rgba(0,0,0,0.05);
  padding: 10px;
}

.fs-chatbot-composer-row {
  display: flex;
  gap: 6px;
}

.fs-chatbot-input {
  flex: 1;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
  background: #fff;
}

.fs-chatbot-send {
  border: none;
  background: #2e646b;
  color: white;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 12px;
  cursor: pointer;
}

.fs-chatbot-send:disabled {
  opacity: 0.5;
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
    height: 60vh;
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
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  const [activeAgentId, setActiveAgentId] = useState("platform-guide");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    requestChatAgents().then((p) => {
      setAgents(p.agents || []);
      setProviders(p.providers || null);
    });
  }, [enabled]);

  useEffect(() => {
    if (!open || messages.length) return;
    setMessages([
      createMessage("assistant", "Ask about FlowSense or agents.", activeAgentId),
    ]);
  }, [open]);

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
          </div>

          <div className="fs-chatbot-composer">
            <div className="fs-chatbot-composer-row">
              <input
                className="fs-chatbot-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
              />
              <button onClick={submit} disabled={loading}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="fs-chatbot-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "Close" : "Chat"}
      </button>
    </div>
  );
}