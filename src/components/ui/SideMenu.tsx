'use client';
import { useState } from 'react';
import { Menu } from '@/components/ui/icons';

export default function SideMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      {open && (
        <div className="absolute top-0 -left-6 h-screen w-72 z-50 bg-white text-black flex flex-col p-6 gap-4 shadow-2xl">
        <button
          className="self-end text-black font-bold text-2xl leading-none"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>
        <p>Insert content</p>
        </div>
      )}

      {/* Trigger button */}
      <button
        className="absolute top-6 left-0 z-10 cursor-pointer"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu />
      </button>
    </>
  );
}
