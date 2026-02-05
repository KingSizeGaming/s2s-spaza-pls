"use client";

import { useEffect, useState } from "react";

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

export default function RegistrationForm({
  token,
  fontClassName,
}: {
  token: string;
  fontClassName: string;
}) {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompletionResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);

  const onChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((prev) => {
      switch (field) {
        case "firstName":
        case "lastName": {
          const cleaned = value.replace(/[^a-zA-Z\s]/g, "");
          const normalized = cleaned.replace(/\s+/g, " ").trimStart();
          return { ...prev, [field]: normalized };
        }
        case "idNumber":
          return { ...prev, idNumber: value.replace(/[^0-9]/g, "").slice(0, 13) };
        case "desiredLeaderboardName":
          return {
            ...prev,
            desiredLeaderboardName: value
              .replace(/[^a-zA-Z]/g, "")
              .toUpperCase()
              .slice(0, 3),
          };
        default:
          return { ...prev, [field]: value };
      }
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError(null);
    setModalMessage(null);

    if (
      !form.firstName ||
      !form.lastName ||
      !form.idNumber ||
      !form.desiredLeaderboardName
    ) {
      setModalMessage("All fields must be fulfilled.");
      return;
    }

    if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(form.firstName.trim())) {
      setValidationError("First Name must contain letters only.");
      return;
    }
    if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(form.lastName.trim())) {
      setValidationError("Last Name must contain letters only.");
      return;
    }
    if (!/^[0-9]{13}$/.test(form.idNumber)) {
      setValidationError("SA Identity Number must be exactly 13 digits.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(form.desiredLeaderboardName)) {
      setValidationError("Leaderboard ID must be exactly 3 letters.");
      return;
    }

    setSubmitting(true);
    setResult(null);

    const res = await fetch(`/api/r/${token}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const rawText = await res.text();
    let data: CompletionResponse = {};
    try {
      data = JSON.parse(rawText) as CompletionResponse;
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
    if (result?.leaderboardId && result?.predictionUrl) {
      setSuccessCountdown(3);
      const timer = window.setInterval(() => {
        setSuccessCountdown((prev) => (prev ? prev - 1 : null));
      }, 1000);
      return () => window.clearInterval(timer);
    }
    return;
  }, [result?.leaderboardId, result?.predictionUrl]);

  useEffect(() => {
    if (successCountdown === 0) {
      window.close();
    }
  }, [successCountdown]);

  const fieldBg = "bg-[url('/images/reg_info_panel.png')]";

  return (
    <form onSubmit={submit} className={`space-y-4 ${fontClassName}`}>
      <label className={`flex flex-col gap-2 text-sm text-white ${fontClassName}`}>
        First Name
        <div className={`rounded-full ${fieldBg} bg-cover bg-center p-[3px]`}>
          <input
            className={`w-full rounded-full bg-black/40 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fontClassName}`}
            value={form.firstName}
            onChange={onChange("firstName")}
            inputMode="text"
            pattern="[A-Za-z ]+"
            required
          />
        </div>
      </label>
      <label className={`flex flex-col gap-2 text-sm text-white ${fontClassName}`}>
        Last Name
        <div className={`rounded-full ${fieldBg} bg-cover bg-center p-[3px]`}>
          <input
            className={`w-full rounded-full bg-black/40 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fontClassName}`}
            value={form.lastName}
            onChange={onChange("lastName")}
            inputMode="text"
            pattern="[A-Za-z ]+"
            required
          />
        </div>
      </label>
      <label className={`flex flex-col gap-2 text-sm text-white ${fontClassName}`}>
        SA Identity Number
        <div className={`rounded-full ${fieldBg} bg-cover bg-center p-[3px]`}>
          <input
            className={`w-full rounded-full bg-black/40 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fontClassName}`}
            value={form.idNumber}
            onChange={onChange("idNumber")}
            inputMode="numeric"
            pattern="[0-9]{13}"
            maxLength={13}
            required
          />
        </div>
      </label>
      <label className={`flex flex-col gap-2 text-sm text-white ${fontClassName}`}>
        Leaderboard ID
        <div className={`rounded-full ${fieldBg} bg-cover bg-center p-[3px]`}>
          <input
            className={`w-full rounded-full bg-black/40 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fontClassName}`}
            value={form.desiredLeaderboardName}
            onChange={onChange("desiredLeaderboardName")}
            inputMode="text"
            pattern="[A-Z]{3}"
            maxLength={3}
            required
          />
        </div>
      </label>

      {result?.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {result.error}
        </p>
      )}
      {validationError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {validationError}
        </p>
      )}

      {modalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-zinc-900 shadow-xl">
            <h3 className="text-lg font-semibold">Missing Information</h3>
            <p className="mt-2 text-sm">{modalMessage}</p>
            <button
              type="button"
              className="mt-4 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setModalMessage(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {result?.leaderboardId && result?.predictionUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-zinc-900 shadow-xl">
            <h3 className="text-lg font-semibold">Registration complete</h3>
            <p className="mt-2 text-sm">
              Registration complete please wait for a message to be sent to you.
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Closing in {successCountdown ?? 3}s
            </p>
          </div>
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 p-6 text-zinc-900 shadow-xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="text-sm font-semibold">Processing...</p>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="mx-auto flex w-40 items-center justify-center"
        disabled={submitting}
      >
        <img
          src="/images/submit_button.png"
          alt="Submit"
          className="w-full"
        />
      </button>
    </form>
  );
}
