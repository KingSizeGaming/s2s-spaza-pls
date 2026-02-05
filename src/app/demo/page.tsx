"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const defaultWaNumber = "+27820001111";

function linkify(text: string): { type: "text" | "link"; value: string }[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: { type: "text" | "link"; value: string }[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(urlRegex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    parts.push({ type: "link", value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

type ReplyPayload = {
  reply: { type: "text"; body: string };
};

type HealthPayload = {
  status: "ok" | "error";
  db: boolean;
  weekId: string;
};

type ChatMessage = {
  id: string;
  direction: "out" | "in" | "system";
  text: string;
};

export default function DemoPage() {
  const [waNumber, setWaNumber] = useState(defaultWaNumber);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const lastOutboundRef = useRef<string | null>(null);

  const pushInboundMessage = (text: string) => {
    setChat((prev) => [
      ...prev,
      { id: crypto.randomUUID(), direction: "in", text },
    ]);
  };

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: HealthPayload) => setHealth(data))
      .catch(() => null);
  }, []);

  useEffect(() => {
    const readStored = () => {
      try {
        const raw = localStorage.getItem("demo:lastOutbound");
        if (!raw || raw === lastOutboundRef.current) return;
        lastOutboundRef.current = raw;
        const parsed = JSON.parse(raw) as { message?: string };
        if (parsed?.message) {
          pushInboundMessage(parsed.message);
        }
      } catch {
        // ignore
      }
    };

    readStored();
    const interval = window.setInterval(readStored, 1500);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("demo-outbound");
      channel.onmessage = (event) => {
        if (typeof event.data === "string") {
          try {
            const parsed = JSON.parse(event.data) as { message?: string };
            if (parsed?.message) {
              pushInboundMessage(parsed.message);
            }
          } catch {
            // ignore
          }
        }
      };
    }

    return () => {
      window.clearInterval(interval);
      if (channel) channel.close();
    };
  }, []);

  const replyParts = useMemo(() => {
    return reply ? linkify(reply) : [];
  }, [reply]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setReply(null);
    setChat((prev) => [
      ...prev,
      { id: crypto.randomUUID(), direction: "out", text },
    ]);

    const res = await fetch("/api/simulate/inbound-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: waNumber, message: text }),
    });

    const data = (await res.json()) as ReplyPayload;
    const responseText = data.reply?.body ?? "No reply";
    setReply(responseText);
    setChat((prev) => [
      ...prev,
      { id: crypto.randomUUID(), direction: "in", text: responseText },
    ]);
    setBusy(false);
  };

  const seedOrReset = async (path: "/api/dev/seed" | "/api/dev/reset") => {
    if (!adminKey.trim()) {
      setReply("Missing DEMO_ADMIN_KEY.");
      return;
    }
    setBusy(true);
    const res = await fetch(path, {
      method: "POST",
      headers: { "x-demo-admin-key": adminKey.trim() },
    });
    const data = await res.json();
    const text = JSON.stringify(data, null, 2);
    setReply(text);
    setChat((prev) => [
      ...prev,
      { id: crypto.randomUUID(), direction: "system", text },
    ]);
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          S2S Spaza PSL POC
        </p>
        <h1 className="text-3xl font-semibold">Demo Console</h1>
        <p className="text-sm text-zinc-600">
          Week: {health?.weekId ?? "..."} · DB: {health?.db ? "OK" : "..."}
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-[#ECE5DD] shadow-sm">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-[#075E54] px-5 py-4 text-white">
            <div className="h-9 w-9 rounded-full bg-white/20" />
            <div>
              <p className="text-sm font-semibold">S2S Spaza Demo</p>
              <p className="text-xs text-white/70">WhatsApp simulated</p>
            </div>
          </div>
          <div className="flex h-[520px] flex-col gap-3 overflow-y-auto bg-[#ECE5DD] p-5">
            {chat.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-4 text-sm text-zinc-600">
                Start the conversation by sending a message.
              </p>
            ) : (
              chat.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.direction === "out"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      item.direction === "out"
                        ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[#DCF8C6] px-4 py-3 text-sm text-zinc-900 shadow"
                        : item.direction === "system"
                        ? "max-w-[90%] rounded-2xl bg-amber-100 px-4 py-3 text-xs text-amber-900"
                        : "max-w-[80%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-zinc-900 shadow"
                    }
                  >
                    {item.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-zinc-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type a message"
              />
              <button
                className="rounded-full bg-[#075E54] px-5 py-2 text-sm font-semibold text-white"
                onClick={() => sendMessage(message)}
                disabled={busy}
              >
                Send
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs"
                onClick={() => sendMessage("new 123456")}
                disabled={busy}
              >
                new 123456
              </button>
              <button
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs"
                onClick={() => sendMessage("C123")}
                disabled={busy}
              >
                C123
              </button>
              <button
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs"
                onClick={() => sendMessage("D123")}
                disabled={busy}
              >
                D123
              </button>
              <button
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs"
                onClick={() => sendMessage("E123")}
                disabled={busy}
              >
                E123
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-4">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Test Panel
            </p>
          </div>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Sender
            </h2>
            <label className="mt-4 flex flex-col gap-2 text-sm">
              WhatsApp number
              <input
                className="rounded-lg border border-zinc-200 px-3 py-2"
                value={waNumber}
                onChange={(event) => setWaNumber(event.target.value)}
              />
            </label>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Demo data
            </h2>
            <label className="mt-4 flex flex-col gap-2 text-sm">
              DEMO_ADMIN_KEY
              <input
                className="rounded-lg border border-zinc-200 px-3 py-2"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => seedOrReset("/api/dev/seed")}
                disabled={busy}
              >
                Seed demo data
              </button>
              <button
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
                onClick={() => seedOrReset("/api/dev/reset")}
                disabled={busy}
              >
                Reset demo data
              </button>
              <button
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
                onClick={() => seedOrReset("/api/dev/reset")}
                disabled={busy}
              >
                RESET DATABASE
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Last reply
            </h2>
            <div className="mt-3 min-h-[80px] rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              {reply ? (
                <p>
                  {replyParts.map((part, index) =>
                    part.type === "link" ? (
                      <a
                        key={`${part.value}-${index}`}
                        className="text-zinc-900 underline"
                        href={part.value}
                      >
                        {part.value}
                      </a>
                    ) : (
                      <span key={`${part.value}-${index}`}>{part.value}</span>
                    )
                  )}
                </p>
              ) : (
                "Send a message to see the reply."
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
