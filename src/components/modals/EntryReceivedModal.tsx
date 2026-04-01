'use client';

import { useEffect, useState } from 'react';
interface EntryReceivedModalProps {
  onClose: () => void;
}

export default function EntryReceivedModal({onClose}: EntryReceivedModalProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) onClose();
  }, [countdown, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-purple-light p-3 rounded-2xl max-w-100">
        <div className="bg-purple-dark rounded-xl px-2 py-6 pb-10 relative flex flex-col items-center gap-2 text-center shadow-2xl">
          <span className="rounded-full px-2 border-2 border-white text-3xl bg-green-700 font-extrabold absolute -top-4">✓</span>
          <h2 className="pt-4 font-extrabold text-2xl tracking-wide">Entry Received</h2>
          <p className="text-xl">Your entry has been accepted. Please wait for a message to be sent to you.</p>
          <p className="text-white/50 text-sm">Closing in {countdown}s</p>
        </div>
      </div>
    </div>
  );
}
