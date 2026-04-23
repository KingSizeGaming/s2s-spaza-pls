'use client';

// import { useEffect, useState } from 'react';
import Image from 'next/image';
// import Button from '../ui/Button';

interface EntryReceivedModalProps {
  onClose: () => void;
}

export default function EntryReceivedModal({onClose}: EntryReceivedModalProps) {
  // const [countdown, setCountdown] = useState(5);

  // useEffect(() => {
  //   const timer = window.setInterval(() => {
  //     setCountdown(prev => prev - 1);
  //   }, 5000);
  //   return () => window.clearInterval(timer);
  // }, []);

  // useEffect(() => {
  //   if (countdown === 0) onClose();
  // }, [countdown, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* <div className="bg-purple-light p-3 rounded-2xl max-w-100">
        <div className="bg-purple-dark rounded-xl px-2 py-6 pb-10 relative flex flex-col items-center gap-2 text-center shadow-2xl">
          <h2 className="pt-4 font-extrabold text-2xl tracking-wide">Entry Received</h2>
          <p className="text-xl">Your entry has been accepted. Please wait for a message to be sent to you.</p>
          <p className="text-white/50 text-sm">Closing in {countdown}s</p>
          <span className="absolute -bottom-6">
            <Button onClick={onClose}>EXIT</Button>
          </span>
        </div>
      </div> */}
      <div className="relative">
        <Image src="/images/received_pop_up.png" alt="Entry Received" width={320} height={200} sizes="(max-width: 320px) 100vw, 320px" className="w-full max-w-xs" loading="eager" />
        {/* <p className="text-white/50 text-sm text-center mt-2">Closing in {countdown}s</p> */}
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
