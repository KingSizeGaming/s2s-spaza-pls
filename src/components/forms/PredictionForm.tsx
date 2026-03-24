"use client";

import { useEffect, useState } from "react";
import ConfirmPicksModal from "@/components/modals/ConfirmPicksModal";
import SubmittingModal from "@/components/modals/SubmittingModal";
import EntryReceivedModal from "@/components/modals/EntryReceivedModal";

type SubmitResponse = {
  ok?: boolean;
  leaderboardUrl?: string;
  outboundMessage?: string;
  error?: string;
};

type Pick = "H" | "D" | "A";
type PicksForm = { picks: Pick[] };
type Match = {
  id: string;
  weekId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export default function PredictionForm({ token }: { token: string }) {
  const [form, setForm] = useState<PicksForm>({ picks: [] });
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);

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
    setSuccessCountdown(null);

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
          const payload = JSON.stringify({ message: data.outboundMessage, ts: Date.now() });
          if ("BroadcastChannel" in window) {
            const channel = new BroadcastChannel("demo-outbound");
            channel.postMessage(payload);
            channel.close();
          }
        } catch {
          // ignore
        }
      }
      if (data.leaderboardUrl) setSuccessCountdown(3);
      setResult(data);
    }

    setSubmitting(false);
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/matches?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { matches?: Match[] }) => {
        if (!active) return;
        const nextMatches = Array.isArray(data?.matches) ? data.matches : [];
        setMatches(nextMatches);
        setForm({ picks: nextMatches.map(() => "H" as Pick) });
      })
      .catch(() => {
        if (!active) return;
        setMatches([]);
        setForm({ picks: [] });
      })
      .finally(() => {
        if (!active) return;
        setMatchesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (successCountdown === null || successCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setSuccessCountdown((prev) => (prev ? prev - 1 : null));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [successCountdown]);

  useEffect(() => {
    if (successCountdown === 0) window.close();
  }, [successCountdown]);

  return (
    <form onSubmit={submit} className="flex flex-col h-full gap-4 w-full">
      {/* Heading */}
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-white tracking-wide border-2 border-green-500 rounded-full px-6 py-2 inline-block">
          Your Picks
        </h1>
      </div>

      {/* Matches */}
      <div className="flex-1 min-h-0 bg-green-600 rounded-2xl overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {matchesLoading && (
          <div className="p-4 text-center text-sm text-white/80">Loading matches...</div>
        )}
        {!matchesLoading && matches.length === 0 && (
          <div className="p-4 text-center text-sm text-white/80">No matches available for this week yet.</div>
        )}
        {matches.map((match, index) => {
          const pick = form.picks[index] ?? "H";
          const kickoff = new Date(match.kickoffAt);
          const kickoffLabel = Number.isNaN(kickoff.getTime())
            ? "TBD"
            : kickoff.toLocaleString("en-ZA", { weekday: "short", hour: "2-digit", minute: "2-digit" });
          return (
            <div key={match.id} className="rounded-2xl m-4 bg-green-950 px-4 py-3 text-center">
              <p className="font-extrabold text-white text-base">{`${match.homeTeam} vs ${match.awayTeam}`}</p>
              <p className="text-white/70 text-xs mb-2">{kickoffLabel}</p>
              <p className="text-white/60 text-xs mb-2">Select Your Pick!</p>
              <div className="flex justify-center gap-2">
                {(["H", "D", "A"] as Pick[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updatePick(index, option)}
                    className={`rounded-full px-4 py-1 text-sm font-bold transition ${
                      pick === option
                        ? "bg-cyan-500 text-white shadow-[0_3px_0_#0e7490]"
                        : "bg-cyan-700/60 text-white/80"
                    }`}
                  >
                    {option === "H" ? "HOME" : option === "D" ? "DRAW" : "AWAY"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {result?.error && (
        <p className="rounded-lg border border-rose-400/50 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
          {result.error}
        </p>
      )}

      <button
        type="submit"
        className="self-center rounded-full py-3 px-12 font-extrabold text-white text-base tracking-wide shadow-lg transition active:scale-95 disabled:opacity-50"
        style={{ background: "linear-gradient(180deg, #4caf50 0%, #1b5e20 100%)", boxShadow: "0 4px 0 #0a3d0c" }}
        disabled={submitting || matchesLoading || matches.length === 0}
      >
        Submit
      </button>

        {submitting && <SubmittingModal />}
        {confirmOpen && (
          <ConfirmPicksModal
            onConfirm={confirmSubmit}
            onCancel={() => setConfirmOpen(false)}
            submitting={submitting}
          />
        )}

        {result?.leaderboardUrl && <EntryReceivedModal />}
      </form>
  );
}
