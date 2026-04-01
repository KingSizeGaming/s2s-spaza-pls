"use client";

import Image from "next/image";
// import Button from "@/components/ui/Button";

interface ConfirmPicksModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

export default function ConfirmPicksModal({ onConfirm, onCancel, submitting }: ConfirmPicksModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* <div className="bg-purple-light p-3 rounded-2xl max-w-100">
        <div className="bg-purple-dark rounded-xl px-2 py-6 relative flex flex-col items-center gap-2 text-center shadow-2xl">
          <h2 className="font-extrabold text-2xl tracking-wide">Submit final picks?</h2>
          <p className="text-xl">Your entry is final and cannot be changed after submission.</p>
          <span className="flex gap-10">
            <Button type="button" color="red" size="md" onClick={onCancel}>NO</Button>
            <Button type="button" color="green" size="md" onClick={onConfirm} disabled={submitting}>YES</Button>
          </span>
        </div>
      </div> */}
      <div className="relative">
        <Image src="/images/submit_pop_up.png" alt="Submit final picks?" width={320} height={200} className="max-w-xs" />
        <span className="flex absolute inset-0 items-center justify-center" style={{ top: "72%", transform: "translateY(-50%)" }}>
          <button
            type="button"
            onClick={onCancel}
            className="w-28 h-12 bg-[url('/images/no_button_untapped.png')] bg-contain bg-center bg-no-repeat active:bg-[url('/images/no_button_tapped.png')]"
          />
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="w-28 h-12 bg-[url('/images/yes_button_untapped.png')] bg-contain bg-center bg-no-repeat active:bg-[url('/images/yes_button_tapped.png')] disabled:opacity-50"
          />
        </span>
      </div>
    </div>
  );
}
