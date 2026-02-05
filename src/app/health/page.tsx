import { headers } from "next/headers";

const statusStyles = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
};

type HealthResponse = {
  status: "ok" | "error";
  db: boolean;
  weekId: string;
  error?: string;
};

async function getHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health", { cache: "no-store" });
  try {
    return await res.json();
  } catch {
    const text = await res.text();
    return {
      status: "error",
      db: false,
      weekId: "unknown",
      error: `Non-JSON response (${res.status}): ${text.slice(0, 120)}`,
    };
  }
}

export default async function HealthPage() {
  const data = await getHealth();
  const status = data.status === "ok" ? "ok" : "error";
  const style = statusStyles[status];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          S2S Spaza PSL POC
        </p>
        <h1 className="text-3xl font-semibold">System Health</h1>
      </header>

      <section className={`rounded-2xl border p-6 ${style}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]">Status</p>
            <p className="text-2xl font-semibold">
              {data.status === "ok" ? "OK" : "Unavailable"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">Week: {data.weekId}</p>
          </div>
          <span className="text-sm">/api/health</span>
        </div>
        {data.status !== "ok" && (
          <p className="mt-4 text-sm">{data.error ?? "Unknown error"}</p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        <p className="font-medium text-zinc-900">Response payload</p>
        <pre className="mt-3 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-100">
{JSON.stringify(data, null, 2)}
        </pre>
      </section>
    </main>
  );
}
