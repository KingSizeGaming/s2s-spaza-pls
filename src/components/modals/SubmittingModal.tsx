"use client";

export default function SubmittingModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#072610] border border-white/20 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <p className="text-white text-sm font-semibold">Processing...</p>
      </div>
    </div>
  );
}
