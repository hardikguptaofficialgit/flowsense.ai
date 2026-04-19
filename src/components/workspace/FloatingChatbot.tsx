import { useEffect, useMemo, useRef, useState } from "react";
import { requestChatAgents, requestChatMessage } from "../../api";
import type { ChatAgent, ChatMessage } from "../../types";

const CHAT_CSS = `
  .fs-chatbot-shell {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 120;
    font-family: 'DM Sans', sans-serif;
  }

  .fs-chatbot-toggle {
    border: 1px solid rgba(36, 75, 80, 0.24);
    background: linear-gradient(135deg, #2e646b 0%, #244f54 100%);
    color: #fff;
    border-radius: 999px;
    min-height: 48px;
    min-width: 48px;
    padding: 0 16px;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(36, 75, 80, 0.25);
  }

  .fs-chatbot-panel {
    width: min(380px, calc(100vw - 24px));
    height: min(560px, calc(100vh - 100px));
    background: #fffdfa;
    border: 1px solid rgba(36, 75, 80, 0.18);
    border-radius: 18px;
    box-shadow: 0 16px 40px rgba(19, 39, 44, 0.18);
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .fs-chatbot-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px;
    border-bottom: 1px solid rgba(36, 75, 80, 0.1);
    background: linear-gradient(180deg, rgba(186, 216, 236, 0.22), rgba(255, 253, 250, 0.94));
  }

  .fs-chatbot-title {
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .fs-chatbot-sub {
    font-size: 11px;
    color: #64767a;
  }

  .fs-chatbot-close {
    border: 1px solid rgba(36, 75, 80, 0.2);
    background: #fff;
    border-radius: 999px;
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-size: 12px;
  }

  .fs-chatbot-agents {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(36, 75, 80, 0.1);
    background: rgba(255, 253, 250, 0.96);
  }

  .fs-chatbot-agent {
    border: 1px solid rgba(36, 75, 80, 0.18);
    background: rgba(186, 216, 236, 0.18);
    color: #23383d;
    border-radius: 999px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .fs-chatbot-agent.active {
    background: rgba(184, 221, 194, 0.34);
    border-color: rgba(36, 75, 80, 0.28);
  }

  .fs-chatbot-stream {
    padding: 12px;
    overflow-y: auto;
    display: grid;
    gap: 8px;
    background: linear-gradient(180deg, #fffdfa 0%, #f8fbf9 100%);
  }

  .fs-chat-bubble {
    border-radius: 12px;
    padding: 10px;
    font-size: 13px;
    line-height: 1.45;
    border: 1px solid rgba(36, 75, 80, 0.12);
    white-space: pre-wrap;
  }

  .fs-chat-bubble.user {
    background: rgba(186, 216, 236, 0.24);
    justify-self: end;
    max-width: 86%;
  }

  .fs-chat-bubble.assistant {
    background: #ffffff;
    justify-self: start;
    max-width: 90%;
  }

  .fs-chat-meta {
    display: block;
    font-size: 10px;
    color: #64767a;
    margin-bottom: 3px;
  }

  .fs-chatbot-composer {
    border-top: 1px solid rgba(36, 75, 80, 0.1);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    padding: 10px;
    background: #fffdfa;
  }

  .fs-chatbot-input {
    border: 1px solid rgba(36, 75, 80, 0.2);
    border-radius: 10px;
    min-height: 38px;
    padding: 8px 10px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
  }

  .fs-chatbot-send {
    border: 1px solid #2f6066;
    background: #2f6066;
    color: #fff;
    border-radius: 10px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .fs-chatbot-send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    .fs-chatbot-shell {
      right: 10px;
      left: 10px;
      bottom: 10px;
    }

    .fs-chatbot-panel {
      width: 100%;
      height: min(70vh, 520px);
    }

    .fs-chatbot-toggle {
      width: 100%;
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
            <button className="fs-chatbot-close" type="button" onClick={() => setOpen(false)}>
              x
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
              placeholder="Ask about FlowSense, reports, or deployed agents..."
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
        {open ? "Close assistant" : "Open AI assistant"}
      </button>
    </div>
  );
}
