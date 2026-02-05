"use client";

import { useMemo, useState } from "react";

type SubmitResponse = {
  ok?: boolean;
  leaderboardUrl?: string;
  error?: string;
};

type Pick = "H" | "D" | "A";

type PicksForm = {
  picks: Pick[];
  confirmFinal: boolean;
};

const defaultPicks: Pick[] = ["H", "H", "H", "H", "H"];

export default function PredictionForm({ token }: { token: string }) {
  const [form, setForm] = useState<PicksForm>({
    picks: defaultPicks,
    confirmFinal: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  const jsonPreview = useMemo(
    () => JSON.stringify({ picks: form.picks }, null, 2),
    [form.picks]
  );

  const updatePick = (index: number, value: Pick) => {
    setForm((prev) => {
      const next = [...prev.picks];
      next[index] = value;
      return { ...prev, picks: next };
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    if (!form.confirmFinal) {
      setResult({ error: "Please confirm your entry is final." });
      setSubmitting(false);
      return;
    }

    const res = await fetch(`/api/p/${token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks: form.picks }),
    });

    const data = (await res.json()) as SubmitResponse;
    if (!res.ok) {
      setResult({ error: data.error ?? "Something went wrong." });
    } else {
      setResult(data);
    }

    setSubmitting(false);
  };

  if (result?.leaderboardUrl) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <p className="text-sm uppercase tracking-[0.2em]">Entry received</p>
        <p className="mt-2 text-2xl font-semibold">You are in!</p>
        <a
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white"
          href={result.leaderboardUrl}
        >
          View leaderboard
        </a>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Picks
        </h2>
        <div className="mt-4 space-y-3">
          {form.picks.map((pick, index) => (
            <label
              key={`pick-${index}`}
              className="flex items-center justify-between text-sm"
            >
              <span>Game {index + 1}</span>
              <select
                className="rounded-lg border border-zinc-200 px-3 py-2"
                value={pick}
                onChange={(event) =>
                  updatePick(index, event.target.value as Pick)
                }
              >
                <option value="H">H</option>
                <option value="D">D</option>
                <option value="A">A</option>
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
          JSON preview
        </p>
        <textarea
          className="mt-3 h-32 w-full rounded-lg border border-zinc-200 p-3 text-xs"
          value={jsonPreview}
          readOnly
        />
      </section>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.confirmFinal}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              confirmFinal: event.target.checked,
            }))
          }
        />
        Entry is final
      </label>

      {result?.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {result.error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit picks"}
      </button>
    </form>
  );
}
