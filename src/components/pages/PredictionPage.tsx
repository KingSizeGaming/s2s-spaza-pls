import { eq } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import ErrorCard from "@/components/ErrorCard";
import PredictionForm from "@/components/forms/PredictionForm";
import Logo from "../ui/Logo";

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
    <main className="flex justify-center h-screen ">
      <div className="bg-[#072610] w-full max-w-125 px-2 py-10 flex flex-col items-center gap-8">
        <Logo />
        <div className="w-full flex-1 flex flex-col min-h-0">
          <PredictionForm token={token} />
        </div>
      </div>
    </main>
  );
}

export default PredictionPage;
