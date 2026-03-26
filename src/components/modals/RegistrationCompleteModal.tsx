"use client";

import Button from "@/components/ui/Button";

interface RegistrationCompleteModalProps {
  onClose: () => void;
}

export default function RegistrationCompleteModal({ onClose }: RegistrationCompleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-green-dark border border-white/20 rounded-2xl px-8 py-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 text-center shadow-2xl">
        <h2 className="text-white font-extrabold text-2xl tracking-wide">
          Registration Complete
        </h2>
        <p className="text-white/80 text-base leading-relaxed">
          Your registration is complete. Please wait for a message to be sent to you.
        </p>
        <Button onClick={onClose} color="red" size="md">
          Exit
        </Button>
      </div>
    </div>
  );
}
