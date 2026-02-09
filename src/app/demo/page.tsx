"use client";

import { useEffect, useState } from "react";

const defaultWaNumber = "+27820001111";

function normalizeWaNumber(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

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

type ChatMessage = {
  id: string;
  direction: "out" | "in" | "system";
  text: string;
};

export default function DemoPage() {
  const [waNumber, setWaNumber] = useState(defaultWaNumber);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);

  const pushInboundMessage = (text: string) => {
    setChat((prev) => [
      ...prev,
      { id: crypto.randomUUID(), direction: "in", text },
    ]);
  };

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("demo-outbound");
      channel.onmessage = (event) => {
        if (typeof event.data === "string") {
          try {
            const parsed = JSON.parse(event.data) as {
              message?: string;
              waNumber?: string;
            };
            const payloadWa = normalizeWaNumber(String(parsed?.waNumber ?? ""));
            const currentWa = normalizeWaNumber(waNumber);
            if (payloadWa && payloadWa !== currentWa) {
              return;
            }
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
      if (channel) channel.close();
    };
  }, [waNumber]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setChat((prev) => [
      ...prev,
      { id: crypto.randomUUID(), direction: "out", text },
    ]);

    let res: Response | null = null;
    try {
      res = await fetch("/api/simulate/inbound-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: waNumber, message: text }),
      });
    } catch {
      setBusy(false);
      return;
    }

    let responseText = `No reply (status ${res.status})`;
    const rawText = await res.text();
    try {
      const data = JSON.parse(rawText) as ReplyPayload;
      responseText = data.reply?.body ?? responseText;
    } catch {
      responseText = rawText || responseText;
    }
    setChat((prev) => [
      ...prev,
      { id: crypto.randomUUID(), direction: "in", text: responseText },
    ]);
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-4 py-6">
        <header className="mb-4 flex w-full max-w-screen-sm items-center justify-between px-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">
              S2S Spaza PSL POC
            </p>
            <h1 className="text-2xl font-semibold text-zinc-900">KingSizeGames POC Demo</h1>
          </div>
        </header>

        <section className="flex w-full max-w-screen-sm flex-1 overflow-hidden rounded-3xl border border-emerald-100 bg-[#EFEAE2] shadow-xl">
          <div className="flex w-full flex-col">
            <div className="flex flex-col gap-3 border-b border-emerald-800/20 bg-[#075E54] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20" />
                <div>
                  <p className="text-sm font-semibold">Talk to Spaza</p>
                  <p className="text-xs text-white/70">WhatsApp simulated</p>
                </div>
              </div>
              <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
                Sender number
                <input
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-200/60"
                  value={waNumber}
                  onChange={(event) => setWaNumber(event.target.value)}
                  placeholder="+27820001111"
                />
              </label>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#EFEAE2] p-6">
              {chat.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-emerald-100 bg-white/80 p-4 text-sm text-zinc-600">
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
                      {item.direction === "out" ? (
                        item.text
                      ) : (
                        <span className="whitespace-pre-line">
                          {linkify(item.text).map((part, index) =>
                            part.type === "link" ? (
                              <a
                                key={`${part.value}-${index}`}
                                className="text-emerald-700 underline"
                                href={part.value}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {part.value}
                              </a>
                            ) : (
                              <span key={`${part.value}-${index}`}>{part.value}</span>
                            )
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-emerald-100 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm shadow-sm"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Type a message ( e.g., code <voucher>, new <spazaId> ...)"
                />
                <button
                  className="rounded-full bg-[#075E54] px-5 py-2 text-sm font-semibold text-white"
                  onClick={() => sendMessage(message)}
                  disabled={busy}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
