"use client";

import { useState } from "react";

// Logo and background image are placeholders until assets are ready.
export default function NewRegistrationPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    leaderboardId: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire up submission logic
    console.log("submit", form);
  }

  return (
    <div className="flex justify-center min-h-screen">
      <div className="bg-[#072610] w-full max-w-[500px] px-6 py-10 flex flex-col items-center gap-8">
        {/* Logo placeholder — replace src with real asset */}
        <div className="w-56 h-28 bg-white/10 rounded-2xl flex items-center justify-center border-2 border-white/20">
          <span className="text-white/40 text-sm font-bold tracking-widest uppercase">Logo</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">

          <div className="flex flex-col gap-1">
            <label className="text-white font-extrabold text-base tracking-wide">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              className="w-full rounded-full px-5 py-3 text-white text-sm outline-none border border-white/10 focus:border-white/30 transition"
              style={{ backgroundColor: "#072610" }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white font-extrabold text-base tracking-wide">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              className="w-full rounded-full px-5 py-3 text-white text-sm outline-none border border-white/10 focus:border-white/30 transition"
              style={{ backgroundColor: "#072610" }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white font-extrabold text-base tracking-wide">
              SA Identity Number
            </label>
            <input
              type="text"
              name="idNumber"
              value={form.idNumber}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={13}
              className="w-full rounded-full px-5 py-3 text-white text-sm outline-none border border-white/10 focus:border-white/30 transition"
              style={{ backgroundColor: "#072610" }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white font-extrabold text-base tracking-wide flex items-baseline gap-2">
              Leaderboard ID
              <span className="text-white/60 font-normal text-xs">
                (Maximum 3 Characters eg: ABC)
              </span>
            </label>
            <input
              type="text"
              name="leaderboardId"
              value={form.leaderboardId}
              onChange={handleChange}
              maxLength={3}
              className="w-full rounded-full px-5 py-3 text-white text-sm outline-none border border-white/10 focus:border-white/30 transition uppercase"
              style={{ backgroundColor: "#072610" }}
            />
          </div>

          <button
            type="submit"
            className="mt-2 mx-auto flex justify-center items-center rounded-full py-4 px-12 font-extrabold text-white text-lg tracking-wide shadow-lg transition active:scale-95"
            style={{
              background: "linear-gradient(180deg, #4caf50 0%, #2e7d32 100%)",
              boxShadow: "0 4px 0 #1b5e20",
            }}
          >
            Submit
          </button>

        </form>
      </div>
    </div>
  );
}
