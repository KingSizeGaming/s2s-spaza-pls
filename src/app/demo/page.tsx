"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function DemoPage() {
  const [waNumber, setWaNumber] = useState(defaultWaNumber);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminKey, setAdminKey] = useState("");

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: HealthPayload) => setHealth(data))
      .catch(() => null);
  }, []);

  const replyParts = useMemo(() => {
    return reply ? linkify(reply) : [];
  }, [reply]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setReply(null);

    const res = await fetch("/api/simulate/inbound-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: waNumber, message: text }),
    });

    const data = (await res.json()) as ReplyPayload;
    setReply(data.reply?.body ?? "No reply");
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
    setReply(JSON.stringify(data, null, 2));
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          S2S Spaza PSL POC
        </p>
        <h1 className="text-3xl font-semibold">Demo Console</h1>
        <p className="text-sm text-zinc-600">
          Week: {health?.weekId ?? "..."} · DB: {health?.db ? "OK" : "..."}
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Simulate inbound message
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            WhatsApp number
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2"
              value={waNumber}
              onChange={(event) => setWaNumber(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Message
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="new 123456"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => sendMessage(message)}
            disabled={busy}
          >
            Send
          </button>
          <button
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
            onClick={() => sendMessage("new 123456")}
            disabled={busy}
          >
            Send “new 123456”
          </button>
          <button
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
            onClick={() => sendMessage("A123")}
            disabled={busy}
          >
            Send “A123”
          </button>
          <button
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
            onClick={() => sendMessage("B123")}
            disabled={busy}
          >
            Send “B123”
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Demo data
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            DEMO_ADMIN_KEY
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
            />
          </label>
          <div className="flex items-end gap-2">
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
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Reply
        </h2>
        <div className="mt-4 min-h-[80px] rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
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
    </main>
  );
}
