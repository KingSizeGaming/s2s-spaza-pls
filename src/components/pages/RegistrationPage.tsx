import { eq } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import ErrorCard from "@/components/ErrorCard";
import RegistrationForm from "@/components/forms/RegistrationForm";

export default async function RegistrationPage({
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
    return <ErrorCard title="Invalid Link" message="This registration link is not valid." titleClassName="font-hitroad" />;
  }

  const link = rows[0];
  const now = new Date();
  const expired = new Date(link.expiresAt).getTime() < now.getTime();

  if (link.type !== "REGISTRATION") {
    return <ErrorCard title="Wrong Link" message="This link is not for registration." titleClassName="font-hitroad" />;
  }

  if (link.status !== "VALID" || expired) {
    return (
      <ErrorCard
        title="Link Expired"
        message="This registration link is expired or already used. Please request a new registration link."
        titleClassName="font-hitroad"
      />
    );
  }

  return <RegistrationForm token={token} />;
}
