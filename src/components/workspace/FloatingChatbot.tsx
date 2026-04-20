import { useEffect, useMemo, useRef, useState } from "react";
import { requestChatAgents, requestChatMessage } from "../../api";
import type { ChatAgent, ChatMessage } from "../../types";

const CHAT_CSS = `
  .fs-chatbot-shell {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 120;
    font-family: 'DM Sans', sans-serif;
  }

  .fs-chatbot-toggle {
    border: none;
    background: #2e646b;
    color: #ffffff;
    border-radius: 999px;
    min-height: 48px;
    min-width: 48px;
    padding: 0 20px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(36, 75, 80, 0.2);
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .fs-chatbot-toggle:hover {
    background: #244f54;
    transform: translateY(-2px);
  }

  .fs-chatbot-panel {
    width: min(360px, calc(100vw - 32px));
    height: min(480px, calc(100vh - 100px));
    background: #ffffff;
    border: 1px solid rgba(36, 75, 80, 0.15);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(19, 39, 44, 0.12);
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .fs-chatbot-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid rgba(36, 75, 80, 0.08);
    background: #fffdfa;
  }

  .fs-chatbot-title {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #13272c;
    letter-spacing: -0.01em;
  }

  .fs-chatbot-sub {
    font-size: 12px;
    color: #64767a;
    margin-top: 2px;
  }

  .fs-chatbot-close {
    border: none;
    background: transparent;
    color: #64767a;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .fs-chatbot-close:hover {
    background: rgba(36, 75, 80, 0.08);
    color: #13272c;
  }

  .fs-chatbot-agents {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(36, 75, 80, 0.08);
    background: #ffffff;
  }

  .fs-chatbot-agent {
    border: 1px solid rgba(36, 75, 80, 0.15);
    background: #ffffff;
    color: #64767a;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .fs-chatbot-agent:hover {
    border-color: rgba(36, 75, 80, 0.3);
    color: #23383d;
  }

  .fs-chatbot-agent.active {
    background: #b8ddc2;
    border-color: #b8ddc2;
    color: #13272c;
  }

  .fs-chatbot-stream {
    padding: 16px;
    overflow-y: auto;
    display: grid;
    gap: 12px;
    background: #f8fbf9;
  }

  .fs-chat-bubble {
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .fs-chat-bubble.user {
    background: #bad8ec;
    color: #13272c;
    justify-self: end;
    max-width: 85%;
    border-bottom-right-radius: 4px;
  }

  .fs-chat-bubble.assistant {
    background: #ffffff;
    color: #23383d;
    border: 1px solid rgba(36, 75, 80, 0.1);
    justify-self: start;
    max-width: 90%;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 6px rgba(19, 39, 44, 0.04);
  }

  .fs-chat-meta {
    display: block;
    font-size: 11px;
    color: inherit;
    opacity: 0.7;
    margin-bottom: 4px;
    font-weight: 600;
  }

  .fs-chatbot-composer {
    border-top: 1px solid rgba(36, 75, 80, 0.08);
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: #ffffff;
  }

  .fs-chatbot-input {
    flex: 1;
    border: 1px solid rgba(36, 75, 80, 0.2);
    border-radius: 8px;
    min-height: 40px;
    padding: 8px 12px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s;
  }

  .fs-chatbot-input:focus {
    border-color: #2e646b;
  }

  .fs-chatbot-send {
    border: none;
    background: #2e646b;
    color: #ffffff;
    border-radius: 8px;
    padding: 0 16px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }

  .fs-chatbot-send:hover:not(:disabled) {
    background: #244f54;
  }

  .fs-chatbot-send:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    .fs-chatbot-shell {
      right: 12px;
      left: 12px;
      bottom: 12px;
    }

    .fs-chatbot-panel {
      width: 100%;
      height: min(65vh, 480px);
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

interface FloatingChatbotProps {
  enabled: boolean;
}

export function FloatingChatbot({ enabled }: FloatingChatbotProps) {
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
    requestChatAgents()
      .then((payload) => {
        setAgents(payload.agents || []);
      })
      .catch(() => {
        setAgents([]);
      });
  }, [enabled]);

  useEffect(() => {
    if (!open || messages.length > 0) return;
    const intro = createMessage(
      "assistant",
      "Hi, I am your FlowSense assistant. Ask about platform features, UX reports, deployment hooks, or switch agents to chat with a specific deployed capability.",
      activeAgentId
    );
    setMessages([intro]);
  }, [open, messages.length, activeAgentId]);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages]);

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) || agents[0] || null,
    [agents, activeAgentId]
  );

  if (!enabled) return null;

  const submit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = createMessage("user", text, activeAgentId);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const reply = await requestChatMessage({
        agentId: activeAgentId,
        message: text,
      });

      setMessages((prev) => [
        ...prev,
        createMessage("assistant", reply.answer, reply.agentId || activeAgentId),
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        createMessage(
          "assistant",
          error instanceof Error ? error.message : "Unable to process chat request right now.",
          activeAgentId
        ),
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fs-chatbot-shell">
      {open && (
        <div className="fs-chatbot-panel" role="dialog" aria-label="FlowSense assistant chat">
          <div className="fs-chatbot-head">
            <div>
              <div className="fs-chatbot-title">FlowSense Assistant</div>
              <div className="fs-chatbot-sub">{activeAgent ? `Agent: ${activeAgent.name}` : "Select a deployed agent"}</div>
            </div>
            <button className="fs-chatbot-close" type="button" onClick={() => setOpen(false)} aria-label="Close chat">
              ✕
            </button>
          </div>

          <div className="fs-chatbot-agents">
            {(agents.length ? agents : [{ id: "platform-guide", name: "Platform Guide", role: "Default" }]).map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`fs-chatbot-agent ${agent.id === activeAgentId ? "active" : ""}`}
                onClick={() => setActiveAgentId(agent.id)}
              >
                {agent.name}
              </button>
            ))}
          </div>

          <div className="fs-chatbot-stream" ref={streamRef}>
            {messages.map((message) => (
              <div key={message.id} className={`fs-chat-bubble ${message.role}`}>
                <span className="fs-chat-meta">
                  {message.role === "user" ? "You" : "Assistant"}
                </span>
                {message.text}
              </div>
            ))}
          </div>

          <div className="fs-chatbot-composer">
            <input
              className="fs-chatbot-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about FlowSense, reports, or agents..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <button className="fs-chatbot-send" type="button" onClick={() => void submit()} disabled={loading}>
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}

      <button className="fs-chatbot-toggle" type="button" onClick={() => setOpen((prev) => !prev)}>
        {open ? "Close chat" : "Open AI assistant"}
      </button>
    </div>
  );
}