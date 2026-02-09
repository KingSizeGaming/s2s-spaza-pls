import { eq } from "drizzle-orm";
import localFont from "next/font/local";
import Image from "next/image";
import { db } from "@/db";
import { links } from "@/db/schema";
import RegistrationForm from "./registration-form";

const hitRoad = localFont({
  src: "../../../../public/fonts/hit_the_road/hitroad.ttf",
  display: "swap",
});

function renderError(title: string, message: string) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4">
        <div className="w-full rounded-3xl border border-emerald-700 bg-white p-6 text-zinc-900 shadow-xl">
          <h1 className={`text-2xl font-semibold ${hitRoad.className}`}>
            {title}
          </h1>
          <p className="mt-3 text-sm text-zinc-600">{message}</p>
        </div>
      </div>
    </main>
  );
}

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
    return renderError("Invalid Link", "This registration link is not valid.");
  }

  const link = rows[0];
  const expiresAt = new Date(link.expiresAt);
  const expired = expiresAt.getTime() < new Date().getTime();
  if (link.type !== "REGISTRATION") {
    return renderError("Wrong Link", "This link is not for registration.");
  }

  if (link.status !== "VALID" || expired) {
    return renderError(
      "Link Expired",
      "This registration link is expired or already used. Please request a new registration link."
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
