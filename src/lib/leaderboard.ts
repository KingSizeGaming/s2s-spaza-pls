export function normalizeDesiredLeaderboard(input: string): string {
  if (!input) return "";
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export async function generateUniqueLeaderboardId(
  desired: string,
  existsFn: (id: string) => Promise<boolean>
): Promise<string> {
  let base = normalizeDesiredLeaderboard(desired);
  if (!base) base = "AAA";
  base = base.slice(0, 3);

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const rand = Math.floor(Math.random() * 1000);
    const digits = String(rand).padStart(3, "0");
    const candidate = `${base}${digits}`;
    if (!(await existsFn(candidate))) {
      return candidate;
    }
  }

  throw new Error("Unable to generate unique leaderboard ID.");
}

if (process.env.NODE_ENV !== "production") {
  const normalized = normalizeDesiredLeaderboard("a b-c!");
  if (normalized !== "ABC") {
    throw new Error(`leaderboard.ts sanity check failed: ${normalized}`);
  }

  const existing = new Set(["ABC", "ABC1"]);
  generateUniqueLeaderboardId("abc", async (id) => existing.has(id)).then(
    (id) => {
      if (!/^ABC\\d{3}$/.test(id)) {
        throw new Error(`leaderboard.ts sanity check failed: ${id}`);
      }
    }
  );
}
