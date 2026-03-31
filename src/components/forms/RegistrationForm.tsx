"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Logo from "@/components/ui/Logo";
import { parseSaIdBirthDate, isAtLeastAge } from "@/lib/sa-id";
import LoadingModal from "@/components/modals/LoadingModal";
import ErrorModal from "@/components/modals/ErrorModal";
import RegistrationCompleteModal from "@/components/modals/RegistrationCompleteModal";

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
      setResult(data);
    }

    setSubmitting(false);
  }


  return (
    <>
      {modalMessage && (
        <ErrorModal title="Missing Information" message={modalMessage} onClose={() => setModalMessage(null)} />
      )}

      {result?.leaderboardId && result?.predictionUrl && (
        <RegistrationCompleteModal onClose={() => window.close()} />
      )}

      {submitting && <LoadingModal />}

      <div className="flex justify-center min-h-screen">
        <div className="w-full max-w-125 px-6 pb-10 flex flex-col items-center gap-8 bg-[url('/images/bg-purple.webp')] bg-cover bg-center">
          <Logo />

          <form onSubmit={handleSubmit} className="w-full py-2 flex flex-col gap-5">
            <FormField label="First Name" name="firstName" value={form.firstName} onChange={handleChange} autoComplete="given-name" />
            <FormField label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} autoComplete="family-name" />
            <FormField label="SA Identity Number" name="idNumber" value={form.idNumber} onChange={handleChange} inputMode="numeric" maxLength={13} />
            <FormField label="Leaderboard ID" hint="(Maximum 3 Characters eg: ABC)" name="desiredLeaderboardName" value={form.desiredLeaderboardName} onChange={handleChange} maxLength={3} className="uppercase" />

            {(result?.error || validationError) && (
              <ErrorModal
                title="Error"
                message={result?.error ?? validationError ?? ""}
                onClose={() => { setResult(null); setValidationError(null); }}
              />
            )}

            <Button type="submit" color="purple" size="md" className="w-fit mx-auto" disabled={submitting}>
              Submit
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
