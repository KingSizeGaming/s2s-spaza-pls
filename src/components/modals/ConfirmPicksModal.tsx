"use client";

import Button from "@/components/ui/Button";

interface ConfirmPicksModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

export default function ConfirmPicksModal({ onConfirm, onCancel, submitting }: ConfirmPicksModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-green-dark border border-white/20 rounded-2xl px-8 py-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 text-center shadow-2xl">
        <h2 className="text-white font-extrabold text-2xl tracking-wide">
          Submit final picks?
        </h2>
        <p className="text-white/80 text-base leading-relaxed">
          Your entry is final and cannot be changed after submission.
        </p>
        <div className="flex gap-4">
          <Button type="button" color="red" size="md" onClick={onCancel}>
            No
          </Button>
          <Button type="button" color="green" size="md" onClick={onConfirm} disabled={submitting}>
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
}
