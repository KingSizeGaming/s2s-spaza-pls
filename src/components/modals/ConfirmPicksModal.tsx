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
      <div className="bg-purple-light p-3 rounded-2xl max-w-100">
        <div className="bg-purple-dark rounded-xl px-2 py-6 relative flex flex-col items-center gap-2 text-center shadow-2xl">
          <h2 className="font-extrabold text-2xl tracking-wide">Submit final picks?</h2>
          <p className="text-xl">Your entry is final and cannot be changed after submission.</p>
          <span className="flex gap-10">
            <Button type="button" color="red" size="md" onClick={onCancel}>NO</Button>
            <Button type="button" color="green" size="md" onClick={onConfirm} disabled={submitting}>YES</Button>
          </span>
        </div>
      </div>
    </div>
  );
}
