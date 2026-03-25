"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Logo from "@/components/ui/Logo";
import { parseSaIdBirthDate, isAtLeastAge } from "@/lib/sa-id";

type CompletionResponse = {
  leaderboardId?: string;
  predictionUrl?: string;
  outboundMessage?: string;
  error?: string;
};

export default function NewRegistrationForm({ token }: { token: string }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    desiredLeaderboardName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompletionResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      switch (name) {
        case "firstName":
        case "lastName":
          return { ...prev, [name]: value.replace(/[^a-zA-Z\s]/g, "").replace(/\s+/g, " ").trimStart() };
        case "idNumber":
          return { ...prev, idNumber: value.replace(/[^0-9]/g, "").slice(0, 13) };
        case "desiredLeaderboardName":
          return { ...prev, desiredLeaderboardName: value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3) };
        default:
          return { ...prev, [name]: value };
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setModalMessage(null);

    if (!form.firstName || !form.lastName || !form.idNumber || !form.desiredLeaderboardName) {
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
    const birthDate = parseSaIdBirthDate(form.idNumber);
    if (!birthDate) {
      setModalMessage("SA Identity Number is invalid.");
      return;
    }
    if (!isAtLeastAge(birthDate, 18)) {
      setModalMessage("You must be at least 18 years old to register.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(form.desiredLeaderboardName)) {
      setValidationError("Leaderboard ID must be exactly 3 letters.");
      return;
    }

    setSubmitting(true);
    setResult(null);
    setSuccessCountdown(null);

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
      if (data.leaderboardId && data.predictionUrl) setSuccessCountdown(3);
      setResult(data);
    }

    setSubmitting(false);
  }

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
    <>
      {modalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-green-dark border border-white/20 rounded-2xl px-8 py-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 text-center shadow-2xl">
            <h2 className="text-white font-extrabold text-2xl tracking-wide">Missing Information</h2>
            <p className="text-white/80 text-base leading-relaxed">{modalMessage}</p>
            <Button onClick={() => setModalMessage(null)}>OK</Button>
          </div>
        </div>
      )}

      {result?.leaderboardId && result?.predictionUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-green-dark border border-white/20 rounded-2xl px-8 py-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 text-center shadow-2xl">
            <h2 className="text-white font-extrabold text-2xl tracking-wide">Registration Complete</h2>
            <p className="text-white/80 text-base leading-relaxed">
              Your registration is complete. Please wait for a message to be sent to you.
            </p>
            <p className="text-white/50 text-sm">Closing in {successCountdown ?? 3}s</p>
          </div>
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-green-dark border border-white/20 p-8 shadow-2xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="text-white text-sm font-semibold">Processing...</p>
          </div>
        </div>
      )}

      <div className="flex justify-center h-screen">
        <div className="bg-green-dark w-full max-w-125 px-6 py-10 flex flex-col items-center gap-8 ">
          <Logo />

          <form onSubmit={handleSubmit} className="w-full py-8 flex flex-col gap-5">
            <FormField label="First Name" name="firstName" value={form.firstName} onChange={handleChange} autoComplete="given-name" />
            <FormField label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} autoComplete="family-name" />
            <FormField label="SA Identity Number" name="idNumber" value={form.idNumber} onChange={handleChange} inputMode="numeric" maxLength={13} />
            <FormField label="Leaderboard ID" hint="(Maximum 3 Characters eg: ABC)" name="desiredLeaderboardName" value={form.desiredLeaderboardName} onChange={handleChange} maxLength={3} className="uppercase" />

            {(result?.error || validationError) && (
              <p className="rounded-lg border border-rose-400/50 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
                {result?.error ?? validationError}
              </p>
            )}

            <Button type="submit" color="green" size="md" className="w-fit mx-auto" disabled={submitting}>
              Submit
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
