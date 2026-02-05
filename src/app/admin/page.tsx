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
  const [activePanel, setActivePanel] = useState<
    "weekly" | "spaza" | "vouchers" | "matches" | "scores" | "draws" | "reset"
  >("weekly");

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
    <main className="min-h-screen bg-[#EFEAE2] text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-800">
                Admin Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Spaza POC Control Center
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                Run weekly jobs, manage Spaza IDs and vouchers, and set match results
                in one place.
              </p>
            </div>
            <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-800">
              Admin key disabled (POC mode)
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-xl shadow-emerald-100">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "weekly", label: "Weekly Start" },
              { id: "spaza", label: "Spaza" },
              { id: "vouchers", label: "Vouchers" },
              { id: "matches", label: "Matches" },
              { id: "scores", label: "Scores" },
              { id: "draws", label: "Draws" },
              { id: "reset", label: "Reset" },
            ].map((item) => (
              <button
                key={item.id}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activePanel === item.id
                    ? "bg-[#075E54] text-white shadow"
                    : "border border-emerald-200 text-emerald-900 hover:bg-emerald-50"
                }`}
                onClick={() =>
                  setActivePanel(item.id as typeof activePanel)
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl shadow-emerald-100">
            {activePanel === "weekly" && (
              <>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Weekly Free Entry
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Generates prediction links for all ACTIVE users who do not yet have a
                  weekly entry.
                </p>
                <button
                  className="mt-6 w-full rounded-2xl bg-[#075E54] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-[#0B6E63] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                  onClick={triggerWeekly}
                  disabled={weeklyBusy}
                >
                  {weeklyBusy ? "Triggering..." : "Run Weekly Start"}
                </button>
              </>
            )}

            {activePanel === "spaza" && (
              <>
                <h2 className="text-lg font-semibold text-zinc-900">Add Spaza</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Register a shop ID that can issue vouchers.
                </p>
                <div className="mt-4 grid gap-4">
                  <label className="text-sm text-zinc-700">
                    Spaza ID
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="123456"
                      value={spazaSid}
                      onChange={(event) => setSpazaSid(event.target.value)}
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Spaza Name
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="My Spaza Shop"
                      value={spazaName}
                      onChange={(event) => setSpazaName(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-3 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-emerald-300"
                      checked={spazaActive}
                      onChange={(event) => setSpazaActive(event.target.checked)}
                    />
                    Active
                  </label>
                  <button
                    className="rounded-2xl bg-[#075E54] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-[#0B6E63] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={createSpaza}
                    disabled={spazaBusy}
                  >
                    {spazaBusy ? "Saving..." : "Create Spaza"}
                  </button>
                </div>
              </>
            )}

            {activePanel === "vouchers" && (
              <>
                <h2 className="text-lg font-semibold text-zinc-900">Add Vouchers</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Paste tokens separated by commas or new lines.
                </p>
                <div className="mt-4 grid gap-4">
                  <label className="text-sm text-zinc-700">
                    Issuing Spaza ID
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="123456"
                      value={voucherIssuingSid}
                      onChange={(event) => setVoucherIssuingSid(event.target.value)}
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Week ID (optional)
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="2026-W06"
                      value={voucherWeekId}
                      onChange={(event) => setVoucherWeekId(event.target.value)}
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Voucher Tokens
                    <textarea
                      className="mt-2 min-h-[120px] w-full resize-none rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="A123, B123, C123"
                      value={voucherTokens}
                      onChange={(event) => setVoucherTokens(event.target.value)}
                    />
                  </label>
                  <button
                    className="rounded-2xl bg-[#075E54] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-[#0B6E63] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={createVouchers}
                    disabled={voucherBusy}
                  >
                    {voucherBusy ? "Saving..." : "Create Vouchers"}
                  </button>
                </div>
              </>
            )}

            {activePanel === "matches" && (
              <>
                <h2 className="text-lg font-semibold text-zinc-900">Weekly Matches</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Add fixtures manually or pre-seed a full set.
                </p>
                <div className="mt-4 grid gap-4">
                  <label className="text-sm text-zinc-700">
                    Week ID (optional)
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="2026-W06"
                      value={matchWeekId}
                      onChange={(event) => setMatchWeekId(event.target.value)}
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Home Team
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="Chiefs"
                      value={matchHome}
                      onChange={(event) => setMatchHome(event.target.value)}
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Away Team
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="Pirates"
                      value={matchAway}
                      onChange={(event) => setMatchAway(event.target.value)}
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Kickoff (local datetime)
                    <input
                      type="datetime-local"
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      value={matchKickoff}
                      onChange={(event) => setMatchKickoff(event.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-2xl bg-[#075E54] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-[#0B6E63] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={createMatch}
                      disabled={matchBusy}
                    >
                      {matchBusy ? "Saving..." : "Add Match"}
                    </button>
                    <button
                      className="rounded-2xl border border-emerald-200 px-6 py-3 text-sm font-semibold text-emerald-900 shadow-lg shadow-emerald-100 transition hover:translate-y-[-1px] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={preseedMatches}
                      disabled={preseedBusy}
                    >
                      {preseedBusy ? "Seeding..." : "Pre-seed 7 Matches"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {activePanel === "scores" && (
              <>
                <h2 className="text-lg font-semibold text-zinc-900">Match Scores</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Set final scores for the week before running the draw.
                </p>
                <div className="mt-4 grid gap-4">
                  <label className="text-sm text-zinc-700">
                    Week ID (optional)
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="2026-W06"
                      value={scoreWeekId}
                      onChange={(event) => setScoreWeekId(event.target.value)}
                    />
                  </label>
                  <button
                    className="rounded-2xl border border-emerald-200 px-6 py-3 text-sm font-semibold text-emerald-900 shadow-lg shadow-emerald-100 transition hover:translate-y-[-1px] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={loadScores}
                    disabled={scoreLoading}
                  >
                    {scoreLoading ? "Loading..." : "Load Matches"}
                  </button>

                  <div className="max-h-[320px] space-y-3 overflow-auto rounded-2xl border border-emerald-200 bg-[#EFEAE2] p-3">
                    {scoreMatches.length === 0 ? (
                      <p className="text-sm text-zinc-600">
                        No matches loaded.
                      </p>
                    ) : (
                      scoreMatches.map((match) => (
                        <div
                          key={match.id}
                          className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-zinc-700"
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
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
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm"
                              placeholder="Home"
                              value={match.homeScore ?? ""}
                              min={0}
                              onChange={(event) =>
                                updateScore(match.id, "homeScore", event.target.value)
                              }
                            />
                            <input
                              type="number"
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm"
                              placeholder="Away"
                              value={match.awayScore ?? ""}
                              min={0}
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
                    className="rounded-2xl bg-[#075E54] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-[#0B6E63] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={saveScores}
                    disabled={scoreBusy || scoreMatches.length === 0}
                  >
                    {scoreBusy ? "Saving..." : "Save Scores"}
                  </button>
                </div>
              </>
            )}

            {activePanel === "draws" && (
              <>
                <h2 className="text-lg font-semibold text-zinc-900">Weekly Draw</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Draw winners from weekly entries and generate prize messages.
                </p>
                <div className="mt-4 grid gap-4">
                  <label className="text-sm text-zinc-700">
                    Week ID (optional)
                    <input
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="2026-W06"
                      value={drawWeekId}
                      onChange={(event) => setDrawWeekId(event.target.value)}
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Winning Picks Needed (N)
                    <input
                      type="number"
                      min={1}
                      className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      value={drawCount}
                      onChange={(event) => setDrawCount(event.target.value)}
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Prize Codes
                    <textarea
                      className="mt-2 min-h-[120px] w-full resize-none rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                      placeholder="PRIZE-001, PRIZE-002"
                      value={drawCodes}
                      onChange={(event) => setDrawCodes(event.target.value)}
                    />
                  </label>
                  <button
                    className="rounded-2xl bg-[#075E54] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:translate-y-[-1px] hover:bg-[#0B6E63] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={runDraw}
                    disabled={drawBusy}
                  >
                    {drawBusy ? "Drawing..." : "Run Draw"}
                  </button>
                </div>
              </>
            )}

            {activePanel === "reset" && (
              <>
                <h2 className="text-lg font-semibold text-rose-700">Reset Database</h2>
                <p className="mt-1 text-sm text-rose-700">
                  Clears demo data and reseeds the POC defaults. Use only in local/dev.
                </p>
                <button
                  className="mt-6 w-full rounded-2xl border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-700 shadow-lg shadow-rose-100 transition hover:translate-y-[-1px] hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                  onClick={resetDatabase}
                  disabled={resetBusy}
                >
                  {resetBusy ? "Resetting..." : "Reset Database"}
                </button>
              </>
            )}
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl shadow-emerald-100">
            <h2 className="text-lg font-semibold text-zinc-900">Latest Response</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Most recent API response is shown here for quick verification.
            </p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-2xl border border-emerald-200 bg-[#EFEAE2] p-4 text-xs text-zinc-700">
              {responseText}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
