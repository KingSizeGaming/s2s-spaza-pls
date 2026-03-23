import { eq } from "drizzle-orm";
import localFont from "next/font/local";
import Image from "next/image";
import { db } from "@/db";
import { links } from "@/db/schema";
import ErrorCard from "@/components/ErrorCard";
import RegistrationForm from "@/components/forms/RegistrationForm";

const hitRoad = localFont({
  src: "../../../public/fonts/hit_the_road/hitroad.ttf",
  display: "swap",
});

export async function RegistrationPage({
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
    return <ErrorCard title="Invalid Link" message="This registration link is not valid." titleClassName={hitRoad.className} />;
  }

  const link = rows[0];
  const expiresAt = new Date(link.expiresAt);
  const expired = expiresAt.getTime() < new Date().getTime();
  if (link.type !== "REGISTRATION") {
    return <ErrorCard title="Wrong Link" message="This link is not for registration." titleClassName={hitRoad.className} />;
  }

  if (link.status !== "VALID" || expired) {
    return (
      <ErrorCard
        title="Link Expired"
        message="This registration link is expired or already used. Please request a new registration link."
        titleClassName={hitRoad.className}
      />
    );
  }

  return (
    <main className={`min-h-screen bg-white ${hitRoad.className}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4">
        <div className="relative h-[844px] w-full scale-[1.35] overflow-hidden rounded-3xl bg-white">
          <Image
            src="/images/bg_1.png"
            alt="Background"
            fill
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="relative z-20 flex flex-1 flex-col gap-10 px-6 py-16">
            <Image
              src="/images/logo.png"
              alt="Weekly Soccer Picks"
              width={320}
              height={120}
              className="w-full"
            />
            <RegistrationForm token={token} fontClassName={hitRoad.className} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default RegistrationPage;
