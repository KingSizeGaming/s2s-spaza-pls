'use client';

// import { useEffect, useState } from "react";
import Button from "../ui/Button";

interface RegistrationCompleteModalProps {
  onClose: () => void;
}

export default function RegistrationCompleteModal({onClose}: RegistrationCompleteModalProps) {
  // const [countdown, setCountdown] = useState(5);

  // useEffect(() => {
  //   const timer = window.setInterval(() => {
  //     setCountdown((prev) => prev - 1);
  //   }, 1000);
  //   return () => window.clearInterval(timer);
  // }, []);

  // useEffect(() => {
  //   if (countdown === 0) onClose();
  // }, [countdown, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-purple-light p-3 rounded-2xl max-w-100">
        <div className="bg-purple-dark rounded-xl px-2 py-6 pb-10 relative flex flex-col items-center gap-2 text-center shadow-2xl">
          <h2 className="font-extrabold text-2xl tracking-wide">Registration Complete</h2>
          <p className="text-xl">Your registration is complete. Please wait for a message to be sent to you.</p>
          {/* <p className="text-white/50 text-sm">Closing in {countdown}s</p> */}
          <span className="absolute -bottom-6">
            <Button onClick={onClose}>EXIT</Button>
          </span>
        </div>
      </div>
    </div>
  );
}
