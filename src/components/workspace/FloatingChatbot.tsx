import { useEffect, useMemo, useRef, useState } from "react";
import { requestChatAgents, requestChatMessage } from "../../api";
import type { ChatAgent, ChatMessage, ChatMessageResponse, ProviderStatus } from "../../types";

const CHAT_CSS = `
  .fs-chatbot-shell {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 120;
    font-family: 'DM Sans', sans-serif;
  }

  .fs-chatbot-toggle {
    border: 1px solid rgba(36, 75, 80, 0.16);
    background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(238,245,241,0.92));
    color: #234046;
    border-radius: 999px;
    min-height: 50px;
    min-width: 170px;
    padding: 0 18px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 16px 40px rgba(36, 75, 80, 0.18), inset 0 1px 0 rgba(255,255,255,0.96);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .fs-chatbot-toggle:hover {
    transform: translateY(-2px);
    border-color: rgba(36, 75, 80, 0.26);
    box-shadow: 0 20px 44px rgba(36, 75, 80, 0.22), inset 0 1px 0 rgba(255,255,255,0.96);
  }

  .fs-chatbot-panel {
    width: min(420px, calc(100vw - 24px));
    height: min(620px, calc(100vh - 100px));
    background:
      radial-gradient(circle at top right, rgba(186, 216, 236, 0.24), transparent 26%),
      linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,248,245,0.96));
    border: 1px solid rgba(36, 75, 80, 0.14);
    border-radius: 24px;
    box-shadow: 0 20px 48px rgba(19, 39, 44, 0.14), inset 0 1px 0 rgba(255,255,255,0.96);
    display: grid;
    grid-template-rows: auto auto auto 1fr auto;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .fs-chatbot-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 16px 12px;
    border-bottom: 1px solid rgba(36, 75, 80, 0.08);
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(16px);
  }

  .fs-chatbot-title {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 800;
    color: #13272c;
    letter-spacing: -0.02em;
  }

  .fs-chatbot-sub {
    font-size: 12px;
    color: #42565b;
    margin-top: 2px;
  }

  .fs-chatbot-status {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }

  .fs-chatbot-pill {
    border: 1px solid rgba(36, 75, 80, 0.12);
    background: rgba(184, 221, 194, 0.25);
    color: #214046;
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .fs-chatbot-pill.muted {
    background: rgba(255,255,255,0.82);
    color: #64767a;
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
    background: rgba(255,255,255,0.7);
  }

  .fs-chatbot-agent {
    border: 1px solid rgba(36, 75, 80, 0.12);
    background: rgba(255,255,255,0.88);
    color: #46585d;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .fs-chatbot-agent:hover {
    border-color: rgba(36, 75, 80, 0.26);
    color: #1f3135;
  }

  .fs-chatbot-agent.active {
    background: linear-gradient(180deg, rgba(184, 221, 194, 0.94), rgba(168, 205, 179, 0.92));
    border-color: rgba(184, 221, 194, 0.96);
    color: #13272c;
    box-shadow: 0 8px 18px rgba(36, 75, 80, 0.08);
  }

  .fs-chatbot-quick {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px 0;
  }

  .fs-chatbot-quick button {
    border: 1px solid rgba(36, 75, 80, 0.12);
    background: rgba(255,255,255,0.84);
    color: #4f6468;
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 11px;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .fs-chatbot-quick button:hover {
    transform: translateY(-1px);
    border-color: rgba(36, 75, 80, 0.22);
  }

  .fs-chatbot-stream {
    padding: 14px 16px;
    overflow-y: auto;
    display: grid;
    gap: 12px;
    background: linear-gradient(180deg, rgba(248,251,249,0.92), rgba(244,248,245,0.92));
  }

  .fs-chat-empty {
    border: 1px dashed rgba(36, 75, 80, 0.16);
    border-radius: 18px;
    background: rgba(255,255,255,0.8);
    padding: 16px;
    color: #42565b;
    font-size: 13px;
    line-height: 1.6;
  }

  .fs-chat-bubble {
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .fs-chat-bubble.user {
    background: linear-gradient(180deg, rgba(186, 216, 236, 0.96), rgba(165, 201, 224, 0.94));
    color: #13272c;
    justify-self: end;
    max-width: 85%;
    border-bottom-right-radius: 6px;
  }

  .fs-chat-bubble.assistant {
    background: rgba(255,255,255,0.92);
    color: #23383d;
    border: 1px solid rgba(36, 75, 80, 0.1);
    justify-self: start;
    max-width: 90%;
    border-bottom-left-radius: 6px;
    box-shadow: 0 6px 18px rgba(19, 39, 44, 0.05);
  }

  .fs-chat-bubble-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
  }

  .fs-chat-meta {
    display: block;
    font-size: 11px;
    color: inherit;
    opacity: 0.92;
    margin-bottom: 4px;
    font-weight: 600;
  }

  .fs-chat-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid rgba(36, 75, 80, 0.12);
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #64767a;
    background: rgba(255,255,255,0.82);
  }

  .fs-chatbot-composer {
    border-top: 1px solid rgba(36, 75, 80, 0.08);
    display: grid;
    gap: 10px;
    padding: 12px 16px 16px;
    background: rgba(255,255,255,0.78);
  }

  .fs-chatbot-composer .fs-chat-meta {
    color: #42565b;
  }

  .fs-chatbot-composer-row {
    display: flex;
    gap: 8px;
  }

  .fs-chatbot-input {
    flex: 1;
    border: 1px solid rgba(36, 75, 80, 0.2);
    border-radius: 14px;
    min-height: 40px;
    padding: 8px 12px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    background: rgba(255,255,255,0.92);
  }

  .fs-chatbot-input:focus {
    border-color: #2e646b;
    box-shadow: 0 0 0 3px rgba(184, 221, 194, 0.22);
  }

  .fs-chatbot-send {
    border: 1px solid rgba(36, 75, 80, 0.16);
    background: linear-gradient(180deg, #2e646b, #244f54);
    color: #ffffff;
    border-radius: 14px;
    padding: 0 16px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 10px 20px rgba(36, 75, 80, 0.16);
  }

  .fs-chatbot-send:hover:not(:disabled) {
    transform: translateY(-1px);
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
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
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
        setProviders(payload.providers || null);
      })
      .catch(() => {
        setAgents([]);
        setProviders(null);
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

  const quickPrompts = useMemo(() => {
    if (activeAgentId === "ux-analyst") {
      return ["Explain the top UX risk", "What should I fix first?", "How do I reduce friction?"];
    }

    if (activeAgentId === "deploy-agent") {
      return ["What should I gate before release?", "Show the deployment checklist", "How do hooks work?"];
    }

    if (activeAgentId === "profile-coach") {
      return ["What profile fields matter most?", "How do I improve analysis quality?", "What should I fill in next?"];
    }

    return ["How do I start an audit?", "Where are reports saved?", "What does FlowSense automate?"];
  }, [activeAgentId]);

  const providerSummary = providers?.nvidia || providers?.groq
    ? [providers?.nvidia ? "NVIDIA" : null, providers?.groq ? "Groq" : null].filter(Boolean).join(" + ")
    : "Heuristic fallback";

  if (!enabled) return null;

  const submit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = createMessage("user", text, activeAgentId);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const reply: ChatMessageResponse = await requestChatMessage({
        agentId: activeAgentId,
        message: text,
      });

      setMessages((prev) => [
        ...prev,
        {
          ...createMessage("assistant", reply.answer, reply.agentId || activeAgentId),
          provider: reply.provider,
          attemptedProviders: reply.attemptedProviders,
          fallbackUsed: reply.fallbackUsed,
        },
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
              <div className="fs-chatbot-status">
                <span className="fs-chatbot-pill">{providerSummary}</span>
                <span className="fs-chatbot-pill muted">{loading ? "Thinking" : "Ready"}</span>
              </div>
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

          <div className="fs-chatbot-quick">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="fs-chatbot-stream" ref={streamRef}>
            {messages.length ? (
              messages.map((message) => (
                <div key={message.id} className={`fs-chat-bubble ${message.role}`}>
                  <div className="fs-chat-bubble-head">
                    <span className="fs-chat-meta">{message.role === "user" ? "You" : activeAgent?.name || "Assistant"}</span>
                    {message.role === "assistant" ? (
                      <span className="fs-chat-chip">
                        {message.fallbackUsed ? "Fallback" : message.provider || "API"}
                      </span>
                    ) : null}
                  </div>
                  {message.role === "assistant" && message.attemptedProviders?.length ? (
                    <div className="fs-chat-meta">Providers tried: {message.attemptedProviders.map((name) => name.toUpperCase()).join(" → ")}</div>
                  ) : null}
                  {message.text}
                </div>
              ))
            ) : (
              <div className="fs-chat-empty">
                Ask for onboarding help, UX analysis, deployment guidance, or profile setup.
                The assistant routes through NVIDIA first when available, then falls back to Groq or a heuristic response.
              </div>
            )}
          </div>

          <div className="fs-chatbot-composer">
            <div className="fs-chatbot-composer-row">
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
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
            <div className="fs-chat-meta" style={{ marginBottom: 0 }}>
              {activeAgent?.role || "FlowSense assistant"} · {providerSummary}
            </div>
          </div>
        </div>
      )}

      <button className="fs-chatbot-toggle" type="button" onClick={() => setOpen((prev) => !prev)}>
        {open ? "Close chat" : "Open AI assistant"}
      </button>
    </div>
  );
}