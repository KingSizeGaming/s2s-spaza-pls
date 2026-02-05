import { eq } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import PredictionForm from "./prediction-form";

function renderError(title: string, message: string) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4">
        <div className="w-full rounded-3xl border border-emerald-700 bg-white p-6 text-zinc-900 shadow-xl">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm text-zinc-600">{message}</p>
        </div>
      </div>
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
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4">
        <div className="relative h-[844px] w-full scale-[1.35] overflow-hidden rounded-3xl bg-white">
          <img
            src="/images/bg_1.png"
            alt="Background"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="relative z-10 flex h-full flex-col gap-4 px-6 py-8">
            <PredictionForm token={token} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default PredictionPage;
