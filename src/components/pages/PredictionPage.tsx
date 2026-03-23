import { eq } from "drizzle-orm";
import Image from "next/image";
import { db } from "@/db";
import { links } from "@/db/schema";
import ErrorCard from "@/components/ErrorCard";
import PredictionForm from "@/app/p/[token]/prediction-form";

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
    return <ErrorCard title="Invalid Link" message="This prediction link is not valid." />;
  }

  const link = rows[0];
  const expired = link.expiresAt.getTime() < new Date().getTime();
  if (link.type !== "PREDICTION") {
    return <ErrorCard title="Wrong Link" message="This link is not for predictions." />;
  }

  if (link.status !== "VALID" || expired) {
    return (
      <ErrorCard
        title="Link Expired"
        message="This prediction link is expired or already used. Please request a new prediction link."
      />
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4">
        <div className="relative h-[844px] w-full scale-[1.35] overflow-hidden rounded-3xl bg-white">
          <Image
            src="/images/bg_1.png"
            alt="Background"
            fill
            sizes="100vw"
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
