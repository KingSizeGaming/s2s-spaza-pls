"use client";

export default function LoadingModal() {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60">
      <div className="bg-green-dark border border-white/20 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <p className="text-white text-sm font-semibold">Processing...</p>
      </div>
    </div>
  );
}
