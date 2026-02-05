"use client";

import { useMemo, useState } from "react";

type ApiResult = {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
};

type MatchScore = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  homeScore: number | null;
  awayScore: number | null;
};

function asPrettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AdminPage() {
  const [weeklyBusy, setWeeklyBusy] = useState(false);
  const [spazaBusy, setSpazaBusy] = useState(false);
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [response, setResponse] = useState<ApiResult | null>(null);

  const [spazaSid, setSpazaSid] = useState("");
  const [spazaName, setSpazaName] = useState("");
  const [spazaActive, setSpazaActive] = useState(true);

  const [voucherWeekId, setVoucherWeekId] = useState("");
  const [voucherIssuingSid, setVoucherIssuingSid] = useState("");
  const [voucherTokens, setVoucherTokens] = useState("");

  const [matchWeekId, setMatchWeekId] = useState("");
  const [matchHome, setMatchHome] = useState("");
  const [matchAway, setMatchAway] = useState("");
  const [matchKickoff, setMatchKickoff] = useState("");
  const [matchBusy, setMatchBusy] = useState(false);
  const [preseedBusy, setPreseedBusy] = useState(false);
  const [drawWeekId, setDrawWeekId] = useState("");
  const [drawCount, setDrawCount] = useState("1");
  const [drawCodes, setDrawCodes] = useState("");
  const [drawBusy, setDrawBusy] = useState(false);
  const [scoreWeekId, setScoreWeekId] = useState("");
  const [scoreMatches, setScoreMatches] = useState<MatchScore[]>([]);
  const [scoreBusy, setScoreBusy] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);

  const responseText = useMemo(() => {
    if (!response) return "No responses yet.";
    return asPrettyJson(response);
  }, [response]);

  const callApi = async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    try {
      return JSON.parse(text) as ApiResult;
    } catch {
      return { ok: false, error: text || `Request failed (${res.status}).` };
    }
  };

  const triggerWeekly = async () => {
    setWeeklyBusy(true);
    const data = await callApi("/api/cron/weekly-start");
    if (data) setResponse(data);
    setWeeklyBusy(false);
  };

  const createSpaza = async () => {
    setSpazaBusy(true);
    const data = await callApi("/api/admin/spaza", {
      sid: spazaSid,
      name: spazaName,
      isActive: spazaActive,
    });
    if (data) setResponse(data);
    setSpazaBusy(false);
  };

  const createVouchers = async () => {
    setVoucherBusy(true);
    const tokens = voucherTokens
      .split(/[\n,]+/g)
      .map((token) => token.trim())
      .filter(Boolean);
    const data = await callApi("/api/admin/vouchers", {
      weekId: voucherWeekId || undefined,
      vouchers: tokens.map((token) => ({
        voucherToken: token,
        issuingSid: voucherIssuingSid,
      })),
    });
    if (data) setResponse(data);
    setVoucherBusy(false);
  };

  const createMatch = async () => {
    setMatchBusy(true);
    const data = await callApi("/api/admin/matches", {
      weekId: matchWeekId || undefined,
      matches: [
        {
          homeTeam: matchHome,
          awayTeam: matchAway,
          kickoffAt: matchKickoff,
        },
      ],
    });
    if (data) setResponse(data);
    setMatchBusy(false);
  };

  const preseedMatches = async () => {
    setPreseedBusy(true);
    const data = await callApi("/api/admin/matches/preseed", {
      weekId: matchWeekId || undefined,
    });
    if (data) setResponse(data);
    setPreseedBusy(false);
  };

  const runDraw = async () => {
    setDrawBusy(true);
    const codes = drawCodes
      .split(/[\n,]+/g)
      .map((code) => code.trim())
      .filter(Boolean);
    const data = await callApi("/api/admin/draws", {
      weekId: drawWeekId || undefined,
      requiredCorrect: Number(drawCount) || 1,
      prizeCodes: codes,
    });
    if (data && Array.isArray((data as { winners?: { message?: string }[] }).winners)) {
      try {
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel("demo-outbound");
          for (const winner of (data as { winners: { message?: string }[] }).winners) {
            if (winner?.message) {
              channel.postMessage(
                JSON.stringify({ message: winner.message, ts: Date.now() })
              );
            }
          }
          channel.close();
        }
      } catch {
        // ignore
      }
    }
    if (data) setResponse(data);
    setDrawBusy(false);
  };

  const loadScores = async () => {
    setScoreLoading(true);
    const weekId = scoreWeekId || undefined;
    const url = weekId ? `/api/matches?weekId=${encodeURIComponent(weekId)}` : "/api/matches";
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    try {
      const data = JSON.parse(text) as { matches?: MatchScore[] };
      const list = Array.isArray(data?.matches) ? data.matches : [];
      setScoreMatches(
        list.map((match) => ({
          ...match,
          homeScore: match.homeScore ?? null,
          awayScore: match.awayScore ?? null,
        }))
      );
    } catch {
      setScoreMatches([]);
    }
    setScoreLoading(false);
  };

  const updateScore = (
    id: string,
    field: "homeScore" | "awayScore",
    value: string
  ) => {
    setScoreMatches((prev) =>
      prev.map((match) =>
        match.id === id
          ? {
              ...match,
              [field]: value.trim() === "" ? null : Number(value),
            }
          : match
      )
    );
  };

  const saveScores = async () => {
    setScoreBusy(true);
    const data = await callApi("/api/admin/matches/scores", {
      scores: scoreMatches.map((match) => ({
        id: match.id,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      })),
    });
    if (data) setResponse(data);
    setScoreBusy(false);
  };

  const resetDatabase = async () => {
    setResetBusy(true);
    const res = await fetch("/api/dev/reset", { method: "POST" });
    const text = await res.text();
    try {
      setResponse(JSON.parse(text) as ApiResult);
    } catch {
      setResponse({ ok: false, error: text || `Request failed (${res.status}).` });
    }
    setResetBusy(false);
  };

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-600">
            Admin Control Room
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Spaza POC Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                Trigger weekly free entries, manage Spaza IDs and vouchers, and test
                the WhatsApp flow from one place.
              </p>
            </div>
            <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-700">
              Admin key disabled (POC mode)
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-100">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Weekly Free Entry
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Generate prediction links for all ACTIVE users who do not yet have a
              weekly entry for the current week.
            </p>
            <button
              className="mt-6 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={triggerWeekly}
              disabled={weeklyBusy}
            >
              {weeklyBusy ? "Triggering..." : "Run Weekly Start"}
            </button>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-100">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Latest Response
            </h2>
            <pre className="mt-4 max-h-72 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
              {responseText}
            </pre>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-100">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Add Spaza
            </h2>
            <div className="mt-4 grid gap-4">
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Spaza ID
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="123456"
                  value={spazaSid}
                  onChange={(event) => setSpazaSid(event.target.value)}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Spaza Name
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="My Spaza Shop"
                  value={spazaName}
                  onChange={(event) => setSpazaName(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300"
                  checked={spazaActive}
                  onChange={(event) => setSpazaActive(event.target.checked)}
                />
                Active
              </label>
              <button
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-200 transition hover:translate-y-[-1px] hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={createSpaza}
                disabled={spazaBusy}
              >
                {spazaBusy ? "Saving..." : "Create Spaza"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-100">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Add Vouchers
            </h2>
            <div className="mt-4 grid gap-4">
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Issuing Spaza ID
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="123456"
                  value={voucherIssuingSid}
                  onChange={(event) => setVoucherIssuingSid(event.target.value)}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Week ID (optional)
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="2026-W06"
                  value={voucherWeekId}
                  onChange={(event) => setVoucherWeekId(event.target.value)}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Voucher Tokens
                <textarea
                  className="mt-2 min-h-[120px] w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="A123, B123, C123"
                  value={voucherTokens}
                  onChange={(event) => setVoucherTokens(event.target.value)}
                />
              </label>
              <button
                className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-200 transition hover:translate-y-[-1px] hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={createVouchers}
                disabled={voucherBusy}
              >
                {voucherBusy ? "Saving..." : "Create Vouchers"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-100">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Weekly Matches
            </h2>
            <div className="mt-4 grid gap-4">
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Week ID (optional)
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="2026-W06"
                  value={matchWeekId}
                  onChange={(event) => setMatchWeekId(event.target.value)}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Home Team
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="Chiefs"
                  value={matchHome}
                  onChange={(event) => setMatchHome(event.target.value)}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Away Team
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="Pirates"
                  value={matchAway}
                  onChange={(event) => setMatchAway(event.target.value)}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Kickoff (local datetime)
                <input
                  type="datetime-local"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  value={matchKickoff}
                  onChange={(event) => setMatchKickoff(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={createMatch}
                  disabled={matchBusy}
                >
                  {matchBusy ? "Saving..." : "Add Match"}
                </button>
                <button
                  className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 shadow-lg shadow-zinc-100 transition hover:translate-y-[-1px] hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={preseedMatches}
                  disabled={preseedBusy}
                >
                  {preseedBusy ? "Seeding..." : "Pre-seed 7 Matches"}
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-xl shadow-rose-100">
            <h2 className="text-sm uppercase tracking-[0.35em] text-rose-600">
              Reset Database
            </h2>
            <p className="mt-3 text-sm text-rose-700">
              Clears demo data and reseeds the POC defaults. Use only in local/dev.
            </p>
            <button
              className="mt-6 rounded-full border border-rose-300 bg-white px-6 py-3 text-sm font-semibold text-rose-700 shadow-lg shadow-rose-100 transition hover:translate-y-[-1px] hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={resetDatabase}
              disabled={resetBusy}
            >
              {resetBusy ? "Resetting..." : "Reset Database"}
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-100">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Weekly Draw
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Draw winners from weekly entries and generate prize messages.
            </p>
            <div className="mt-4 grid gap-4">
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Week ID (optional)
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="2026-W06"
                  value={drawWeekId}
                  onChange={(event) => setDrawWeekId(event.target.value)}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Winning Picks Needed (N)
                <input
                  type="number"
                  min={1}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  value={drawCount}
                  onChange={(event) => setDrawCount(event.target.value)}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Prize Codes
                <textarea
                  className="mt-2 min-h-[120px] w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="PRIZE-001, PRIZE-002"
                  value={drawCodes}
                  onChange={(event) => setDrawCodes(event.target.value)}
                />
              </label>
              <button
                className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={runDraw}
                disabled={drawBusy}
              >
                {drawBusy ? "Drawing..." : "Run Draw"}
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-100">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Match Scores
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Set final scores for the week before running the draw.
            </p>
            <div className="mt-4 grid gap-4">
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Week ID (optional)
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400"
                  placeholder="2026-W06"
                  value={scoreWeekId}
                  onChange={(event) => setScoreWeekId(event.target.value)}
                />
              </label>
              <button
                className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 shadow-lg shadow-zinc-100 transition hover:translate-y-[-1px] hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={loadScores}
                disabled={scoreLoading}
              >
                {scoreLoading ? "Loading..." : "Load Matches"}
              </button>

              <div className="max-h-[320px] space-y-3 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                {scoreMatches.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No matches loaded.
                  </p>
                ) : (
                  scoreMatches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                        {new Date(match.kickoffAt).toLocaleString("en-ZA", {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="mt-2 font-semibold">
                        {match.homeTeam} vs {match.awayTeam}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          placeholder="Home"
                          value={match.homeScore ?? ""}
                          onChange={(event) =>
                            updateScore(match.id, "homeScore", event.target.value)
                          }
                        />
                        <input
                          type="number"
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          placeholder="Away"
                          value={match.awayScore ?? ""}
                          onChange={(event) =>
                            updateScore(match.id, "awayScore", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={saveScores}
                disabled={scoreBusy || scoreMatches.length === 0}
              >
                {scoreBusy ? "Saving..." : "Save Scores"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
