# Changelog

## Refactor: Catch-All Routing + Helper Function Centralisation

### 1. Routing restructure — Catch-All

**Before:** Each route had its own Next.js page file.

```
src/app/
├── page.tsx                          # /
├── admin/page.tsx                    # /admin
├── demo/page.tsx                     # /demo
├── health/page.tsx                   # /health
├── leaderboard/page.tsx              # /leaderboard
├── leaderboard/[leaderboardId]/      # /leaderboard/:id
├── predict/[token]/page.tsx          # /predict/:token
└── register/[token]/page.tsx         # /register/:token
```

**After:** A single catch-all route dispatches to page components via a central route config.

```
src/app/
└── [...slug]/page.tsx                # handles every route

src/app/routes.ts                     # route config — maps slugs to components

src/components/pages/
├── AdminPage.tsx
├── DemoPage.tsx
├── HealthPage.tsx
├── HomePage.tsx
├── LeaderboardPage.tsx
├── LeaderboardDetailPage.tsx
├── PredictPage.tsx                   # re-exports PredictionPage (legacy /predict path)
├── PredictionPage.tsx
├── RegisterPage.tsx                  # re-exports RegistrationPage (legacy /register path)
└── RegistrationPage.tsx
```

**How it works:**

`src/app/[...slug]/page.tsx` receives the full URL path as a `slug` array. It looks up `slug[0]` in the `routes` map defined in `routes.ts`. Each route entry declares its component and whether it needs `params`, `searchParams`, or a custom `nestedMatcher` for complex path patterns (e.g. `/leaderboard/:id/week/:weekId`).

Legacy paths (`/predict/:token`, `/register/:token`) are preserved via thin re-export wrappers (`PredictPage`, `RegisterPage`) alongside the canonical short paths (`/p/:token`, `/r/:token`).

---

### 2. Helper functions moved to `src/lib/`

Utility functions that were copy-pasted across multiple API route files and server components have been centralised.

#### `src/lib/week.ts` — extended

The following functions were added and exported (previously duplicated in 3+ route files):

| Function | Description |
|---|---|
| `getIsoWeekYearAndWeek(date)` | ISO week year and week number from a UTC date |
| `toWeekId(date)` | Formats a date as `YYYY-Www` |
| `parseWeekId(weekId)` | Parses `YYYY-Www` → `{ year, week }` or `null` |
| `isoWeekStartUtc(year, week)` | Monday UTC start of an ISO week |
| `getIsoWeekEndUtc(date)` | Sunday 23:59:59.999 UTC end of the ISO week |
| `incrementWeekId(weekId)` | Advances a week ID string by one week |
| `getRealCurrentWeekId(date?)` | Real calendar week ID (ignores `CURRENT_WEEK_ID` env override) |

`getCurrentWeekId` was already exported — it now delegates to `toWeekId` internally.

#### `src/lib/url.ts` — new

Replaces 8 copies of `getBaseUrl` spread across routes and server components.

| Function | Use context |
|---|---|
| `getBaseUrlFromRequest(request)` | API route handlers — reads from `NextRequest` headers |
| `getBaseUrl()` | Server components — reads from `next/headers` asynchronously |

Both check `NEXT_PUBLIC_SITE_URL` first and fall back to `host` / `x-forwarded-proto` headers.

#### `src/lib/sa-id.ts` — new

South African ID number helpers extracted from the registration complete route.

| Function | Description |
|---|---|
| `parseSaIdBirthDate(idNumber)` | Parses DOB from a 13-digit SA ID number |
| `isAtLeastAge(birthDate, minAge, now?)` | Checks if a birth date meets a minimum age requirement |
| `hashSaId(idNumber)` | SHA-256 hash of an ID number with `SA_ID_HASH_SALT` |

#### `src/lib/normalize.ts` — new

Input normalisation helpers used in both the WhatsApp simulation route and `DemoPage`.

| Function | Description |
|---|---|
| `normalizeWaNumber(input)` | Strips all non-digit characters from a phone number |
| `normalizeMessage(input)` | Trims and collapses internal whitespace |

#### `src/lib/draw.ts` — new

Weighted lottery draw logic extracted from the admin draws route.

| Function | Description |
|---|---|
| `pickWeightedWinnerIndex(candidates)` | Picks one winner index weighted by ticket count |
| `drawWeightedUnique(candidates, count)` | Picks N unique winners without replacement |

Also exports the `DrawCandidate` type (`{ waNumber: string; tickets: number }`).

#### `src/components/ErrorCard.tsx` — new

Replaces four copies of a local `renderError` function across the prediction and registration pages.

```tsx
<ErrorCard
  title="Link Expired"
  message="This link has already been used."
  titleClassName={hitRoad.className}  // optional — used by registration pages
/>
```

---

### Files changed

| File | Change |
|---|---|
| `src/app/[...slug]/page.tsx` | New — catch-all route dispatcher |
| `src/app/routes.ts` | New — route config map |
| `src/app/p/[token]/page.tsx` | Removed local `renderError`, imports `ErrorCard` |
| `src/app/r/[token]/page.tsx` | Removed local `renderError`, imports `ErrorCard` |
| `src/app/leaderboard/[leaderboardId]/page.tsx` | Removed local `getBaseUrl`, imports from `@/lib/url` |
| `src/app/leaderboard/[leaderboardId]/week/[weekId]/page.tsx` | Removed local `getBaseUrl`, imports from `@/lib/url` |
| `src/app/api/cron/weekly-start/route.ts` | Removed 6 local helpers, imports from `@/lib/week` + `@/lib/url` |
| `src/app/api/r/[token]/complete/route.ts` | Removed 5 local helpers, imports from `@/lib/week` + `@/lib/url` + `@/lib/sa-id` |
| `src/app/api/simulate/inbound-message/route.ts` | Removed 4 local helpers, imports from `@/lib/week` + `@/lib/url` + `@/lib/normalize` |
| `src/app/api/admin/draws/route.ts` | Removed 2 local helpers, imports from `@/lib/draw` |
| `src/app/api/dev/reset/route.ts` | Removed 2 local helpers, imports from `@/lib/week` |
| `src/app/api/admin/matches/preseed/route.ts` | Removed 2 local helpers, imports from `@/lib/week` |
| `src/components/pages/HealthPage.tsx` | Removed local `getBaseUrl`, imports from `@/lib/url` |
| `src/components/pages/LeaderboardPage.tsx` | Removed local `getBaseUrl`, imports from `@/lib/url` |
| `src/components/pages/LeaderboardDetailPage.tsx` | Removed local `getBaseUrl`, imports from `@/lib/url` |
| `src/components/pages/PredictionPage.tsx` | Removed local `renderError`, imports `ErrorCard` |
| `src/components/pages/RegistrationPage.tsx` | Removed local `renderError`, imports `ErrorCard` |
| `src/components/pages/DemoPage.tsx` | Removed local `normalizeWaNumber`, imports from `@/lib/normalize` |
