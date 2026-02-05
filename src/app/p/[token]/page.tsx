import { eq } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import PredictionForm from "./prediction-form";

function renderError(title: string, message: string) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          S2S Spaza PSL POC
        </p>
        <h1 className="text-3xl font-semibold">{title}</h1>
      </header>
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <p>{message}</p>
      </section>
    </main>
  );
}

export async function PredictionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const rows = await db
    .select({
      token: links.token,
      type: links.type,
      status: links.status,
      expiresAt: links.expiresAt,
    })
    .from(links)
    .where(eq(links.token, token))
    .limit(1);

  if (rows.length === 0) {
    return renderError("Invalid Link", "This prediction link is not valid.");
  }

  const link = rows[0];
  const expired = link.expiresAt.getTime() < Date.now();
  if (link.type !== "PREDICTION") {
    return renderError("Wrong Link", "This link is not for predictions.");
  }

  if (link.status !== "VALID" || expired) {
    return renderError(
      "Link Expired",
      "This prediction link is expired or already used. Please request a new prediction link."
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          S2S Spaza PSL POC
        </p>
        <h1 className="text-3xl font-semibold">Submit Your Picks</h1>
        <p className="text-sm text-zinc-600">
          Choose outcomes for 5 games. Your entry is final once submitted.
        </p>
      </header>
      <PredictionForm token={token} />
    </main>
  );
}

export default PredictionPage;
