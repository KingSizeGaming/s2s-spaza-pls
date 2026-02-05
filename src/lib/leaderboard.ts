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

  if (!(await existsFn(base))) {
    return base;
  }

  let suffix = 1;
  while (true) {
    const candidate = `${base}${suffix}`;
    if (!(await existsFn(candidate))) {
      return candidate;
    }
    suffix += 1;
  }
}

if (process.env.NODE_ENV !== "production") {
  const normalized = normalizeDesiredLeaderboard("a b-c!");
  if (normalized !== "ABC") {
    throw new Error(`leaderboard.ts sanity check failed: ${normalized}`);
  }

  const existing = new Set(["ABC", "ABC1"]);
  generateUniqueLeaderboardId("abc", async (id) => existing.has(id)).then(
    (id) => {
      if (id !== "ABC2") {
        throw new Error(`leaderboard.ts sanity check failed: ${id}`);
      }
    }
  );
}