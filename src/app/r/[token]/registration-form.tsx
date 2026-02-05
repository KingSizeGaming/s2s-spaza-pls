"use client";

import { useState } from "react";

type CompletionResponse = {
  leaderboardId?: string;
  predictionUrl?: string;
  outboundMessage?: string;
  error?: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  idNumber: string;
  desiredLeaderboardName: string;
};

const initialState: FormState = {
  firstName: "",
  lastName: "",
  idNumber: "",
  desiredLeaderboardName: "",
};

export default function RegistrationForm({ token }: { token: string }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompletionResponse | null>(null);

  const onChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch(`/api/r/${token}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = (await res.json()) as CompletionResponse;
    if (!res.ok) {
      setResult({ error: data.error ?? "Something went wrong." });
    } else {
      if (data.outboundMessage) {
        try {
          const payload = JSON.stringify({
            message: data.outboundMessage,
            ts: Date.now(),
          });
          localStorage.setItem("demo:lastOutbound", payload);
          if ("BroadcastChannel" in window) {
            const channel = new BroadcastChannel("demo-outbound");
            channel.postMessage(payload);
            channel.close();
          }
        } catch {
          // ignore storage errors
        }
      }
      setResult(data);
    }

    setSubmitting(false);
  };

  if (result?.leaderboardId && result?.predictionUrl) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <p className="text-sm uppercase tracking-[0.2em]">Registration complete</p>
        <p className="mt-3 text-lg font-semibold">
          Registration complete please wait for a message to be sent to you.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          First name
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2"
            value={form.firstName}
            onChange={onChange("firstName")}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Last name
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2"
            value={form.lastName}
            onChange={onChange("lastName")}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        ID number
        <input
          className="rounded-lg border border-zinc-200 px-3 py-2"
          value={form.idNumber}
          onChange={onChange("idNumber")}
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Desired leaderboard name (first 3 letters)
        <input
          className="rounded-lg border border-zinc-200 px-3 py-2"
          value={form.desiredLeaderboardName}
          onChange={onChange("desiredLeaderboardName")}
          required
        />
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
        {submitting ? "Submitting..." : "Complete registration"}
      </button>
    </form>
  );
}
