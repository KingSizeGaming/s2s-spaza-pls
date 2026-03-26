import { eq } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import ErrorCard from "@/components/ErrorCard";
import PredictionClient from "@/components/forms/PredictionClient";

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

  return <PredictionClient token={token} />;
}

export default PredictionPage;
