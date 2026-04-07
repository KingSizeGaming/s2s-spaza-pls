'use client';

import Image from 'next/image';
// import Button from "../ui/Button";

interface RegistrationCompleteModalProps {
  onClose: () => void;
}

export default function RegistrationCompleteModal({onClose}: RegistrationCompleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* <div className="bg-purple-light p-3 rounded-2xl max-w-100">
        <div className="bg-purple-dark rounded-xl px-2 py-6 pb-10 relative flex flex-col items-center gap-2 text-center shadow-2xl">
          <h2 className="font-extrabold text-2xl tracking-wide">Registration Complete</h2>
          <p className="text-xl">Your registration is complete. Please wait for a message to be sent to you.</p>
          <span className="absolute -bottom-6">
            <Button onClick={onClose}>EXIT</Button>
          </span>
        </div>
      </div> */}
      <div className="relative">
        <Image src="/images/reg_pop_up.png" alt="Registration Complete" width={320} height={200} className="max-w-xs" loading="eager" />
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2">
          <button
            onClick={onClose}
            className="w-24 h-10 sm:w-28 sm:h-12 bg-[url('/images/exit_button_untapped.png')] bg-contain bg-center bg-no-repeat active:bg-[url('/images/exit_button_tapped.png')]"
          />
        </span>
      </div>
    </div>
  );
}
