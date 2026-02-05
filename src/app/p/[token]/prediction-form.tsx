"use client";

import { useEffect, useMemo, useState } from "react";

type SubmitResponse = {
  ok?: boolean;
  leaderboardUrl?: string;
  outboundMessage?: string;
  error?: string;
};

type Pick = "H" | "D" | "A";

type PicksForm = {
  picks: Pick[];
};

const defaultPicks: Pick[] = ["H", "H", "H", "H", "H", "H", "H"];

const matchLabels = [
  "Match 1 - Sat 15:00",
  "Match 2 - Sat 17:30",
  "Match 3 - Sat 16:00",
  "Match 4 - Sun 18:00",
  "Match 5 - Mon 15:00",
  "Match 6 - Mon 17:30",
  "Match 7 - Mon 16:00",
];

export default function PredictionForm({ token }: { token: string }) {
  const [form, setForm] = useState<PicksForm>({
    picks: defaultPicks,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);

  const completedCount = useMemo(() => {
    return form.picks.filter(Boolean).length;
  }, [form.picks]);

  const updatePick = (index: number, value: Pick) => {
    setForm((prev) => {
      const next = [...prev.picks];
      next[index] = value;
      return { ...prev, picks: next };
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setResult(null);

    const res = await fetch(`/api/p/${token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks: form.picks }),
    });

    const rawText = await res.text();
    let data: SubmitResponse = {};
    try {
      data = JSON.parse(rawText) as SubmitResponse;
    } catch {
      data = { error: rawText || "Something went wrong." };
    }
    if (!res.ok) {
      setResult({ error: data.error ?? "Something went wrong." });
    } else {
      if (data.outboundMessage) {
        try {
          const payload = JSON.stringify({
            message: data.outboundMessage,
            ts: Date.now(),
          });
          if ("BroadcastChannel" in window) {
            const channel = new BroadcastChannel("demo-outbound");
            channel.postMessage(payload);
            channel.close();
          }
        } catch {
          // ignore
        }
      }
      setResult(data);
    }

    setSubmitting(false);
  };

  useEffect(() => {
    if (result?.leaderboardUrl) {
      setSuccessCountdown(3);
      const timer = window.setInterval(() => {
        setSuccessCountdown((prev) => (prev ? prev - 1 : null));
      }, 1000);
      return () => window.clearInterval(timer);
    }
    return;
  }, [result?.leaderboardUrl]);

  useEffect(() => {
    if (successCountdown === 0) {
      window.close();
    }
  }, [successCountdown]);

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <div className="space-y-2 text-center text-white">
        <h1 className="text-3xl font-bold">Your Picks</h1>
      </div>

      <div className="mt-20 flex-1 space-y-3 overflow-y-auto pr-1">
        {form.picks.map((pick, index) => (
          <div
            key={`pick-${index}`}
            className="relative overflow-hidden rounded-2xl"
          >
            <img
              src="/images/history_player_panel.png"
              alt="Match panel"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="relative z-10 flex items-center justify-between px-5 py-4 text-base font-semibold text-amber-100">
              <span>{matchLabels[index] ?? `Match ${index + 1}`}</span>
              <select
                className="rounded-full border border-emerald-200/40 bg-black/50 px-3 py-1 text-sm text-white"
                value={pick}
                onChange={(event) =>
                  updatePick(index, event.target.value as Pick)
                }
              >
                <option value="H">H</option>
                <option value="D">D</option>
                <option value="A">A</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {result?.error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {result.error}
        </p>
      )}

      <button
        type="submit"
        className="mt-4 flex w-40 items-center justify-center self-center disabled:opacity-60"
        disabled={submitting}
      >
        <img
          src="/images/submit_button.png"
          alt="Submit"
          className="w-full"
        />
      </button>

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 p-6 text-zinc-900 shadow-xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="text-sm font-semibold">Processing...</p>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Confirm Entry
            </p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-900">
              Submit final picks?
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Your entry is final and cannot be changed after submission.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
                onClick={() => setConfirmOpen(false)}
              >
                No
              </button>
              <button
                type="button"
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                onClick={confirmSubmit}
                disabled={submitting}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {result?.leaderboardUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-zinc-900 shadow-xl">
            <h3 className="text-lg font-semibold">Entry received</h3>
            <p className="mt-2 text-sm">
              Your entry has been accepted. Please wait for a message to be sent to you.
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Closing in {successCountdown ?? 3}s
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
