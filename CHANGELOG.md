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

src/components/
├── forms/
│   ├── PredictionForm.tsx            # client form component
│   └── RegistrationForm.tsx          # client form component
└── pages/
    ├── AdminPage.tsx
    ├── DemoPage.tsx
    ├── HealthPage.tsx
    ├── HomePage.tsx
    ├── LeaderboardPage.tsx
    ├── LeaderboardDetailPage.tsx
    ├── PredictionPage.tsx            # handles /p/:token and /predict/:token
    └── RegistrationPage.tsx          # handles /r/:token and /register/:token
```

**How it works:**

`src/app/[...slug]/page.tsx` receives the full URL path as a `slug` array. It looks up `slug[0]` in the `routes` map defined in `routes.ts`. Each route entry declares its component and whether it needs `params`, `searchParams`, or a custom `nestedMatcher` for complex path patterns (e.g. `/leaderboard/:id/week/:weekId`).

Legacy paths (`/predict/:token`, `/register/:token`) and canonical short paths (`/p/:token`, `/r/:token`) all point directly to the same `PredictionPage` / `RegistrationPage` components in `routes.ts` — no wrapper indirection.

---

### 2. Duplicate page files and re-export wrappers removed

After the catch-all was introduced, several leftover file-system route files continued to silently take routing priority over the catch-all for `/p/:token` and `/r/:token`. This meant the catch-all's version of those pages was never actually rendered, and the same code lived in two places at once.

**Deleted (duplicates / no longer needed):**

| File | Reason |
|---|---|
| `src/app/p/[token]/page.tsx` | Exact duplicate of `PredictionPage.tsx`; file-system route was shadowing the catch-all |
| `src/app/p/[token]/prediction-form.tsx` | Moved to `src/components/forms/PredictionForm.tsx` |
| `src/app/r/[token]/page.tsx` | Exact duplicate of `RegistrationPage.tsx`; same shadowing issue |
| `src/app/r/[token]/registration-form.tsx` | Moved to `src/components/forms/RegistrationForm.tsx` |
| `src/components/pages/PredictPage.tsx` | One-line re-export wrapper — routes.ts now points directly to `PredictionPage` |
| `src/components/pages/RegisterPage.tsx` | One-line re-export wrapper — routes.ts now points directly to `RegistrationPage` |

**Added:**

| File | Description |
|---|---|
| `src/components/forms/PredictionForm.tsx` | Client form component (moved from route folder into components) |
| `src/components/forms/RegistrationForm.tsx` | Client form component (moved from route folder into components) |

**Updated:**

- `routes.ts` — `predict` and `register` entries now reference `PredictionPage` / `RegistrationPage` directly instead of going through wrapper files
- `PredictionPage.tsx` — updated import path for `PredictionForm`
- `RegistrationPage.tsx` — updated import path for `RegistrationForm`

---

### 3. Helper functions moved to `src/lib/`

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

### All files changed

**New files:**

| File | Description |
|---|---|
| `src/app/[...slug]/page.tsx` | Catch-all route dispatcher |
| `src/app/routes.ts` | Route config map |
| `src/components/forms/PredictionForm.tsx` | Client prediction form (moved from route folder) |
| `src/components/forms/RegistrationForm.tsx` | Client registration form (moved from route folder) |
| `src/lib/url.ts` | `getBaseUrlFromRequest` + `getBaseUrl` |
| `src/lib/sa-id.ts` | `parseSaIdBirthDate`, `isAtLeastAge`, `hashSaId` |
| `src/lib/normalize.ts` | `normalizeWaNumber`, `normalizeMessage` |
| `src/lib/draw.ts` | `pickWeightedWinnerIndex`, `drawWeightedUnique` |
| `src/components/ErrorCard.tsx` | Shared error card component |

**Deleted files:**

| File | Reason |
|---|---|
| `src/app/p/[token]/page.tsx` | Duplicate of `PredictionPage.tsx`; shadowed the catch-all |
| `src/app/p/[token]/prediction-form.tsx` | Moved to `src/components/forms/` |
| `src/app/r/[token]/page.tsx` | Duplicate of `RegistrationPage.tsx`; shadowed the catch-all |
| `src/app/r/[token]/registration-form.tsx` | Moved to `src/components/forms/` |
| `src/app/predict/[token]/page.tsx` | Replaced by catch-all + `PredictionPage` |
| `src/app/register/[token]/page.tsx` | Replaced by catch-all + `RegistrationPage` |
| `src/app/page.tsx` | Replaced by catch-all |
| `src/app/admin/page.tsx` | Replaced by catch-all |
| `src/app/demo/page.tsx` | Replaced by catch-all |
| `src/app/health/page.tsx` | Replaced by catch-all |
| `src/app/leaderboard/page.tsx` | Replaced by catch-all |
| `src/components/pages/PredictPage.tsx` | One-line re-export wrapper, no longer needed |
| `src/components/pages/RegisterPage.tsx` | One-line re-export wrapper, no longer needed |

**Modified files:**

| File | Change |
|---|---|
| `src/app/routes.ts` | Removed `PredictPage`/`RegisterPage` imports; `predict`/`register` point directly to page components |
| `src/lib/week.ts` | Added and exported 7 new week utility functions |
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
| `src/components/pages/PredictionPage.tsx` | Removed local `renderError`, imports `ErrorCard`; updated form import path |
| `src/components/pages/RegistrationPage.tsx` | Removed local `renderError`, imports `ErrorCard`; updated form import path |
| `src/components/pages/DemoPage.tsx` | Removed local `normalizeWaNumber`, imports from `@/lib/normalize` |

---

## Refactor: Remaining Inline Duplicate Helpers Removed

### 4. SA ID helpers split into client-safe and server-only modules

`src/lib/sa-id.ts` previously imported Node's `crypto` module (via `hashSaId`), making it unusable in client components. The file has been split:

| File | Change |
|---|---|
| `src/lib/sa-id.ts` | Removed `hashSaId` and the `crypto` import — now fully client-safe |
| `src/lib/sa-id-server.ts` | New file; contains only `hashSaId` (Node `crypto` dependency) |
| `src/app/api/r/[token]/complete/route.ts` | Updated to import `hashSaId` from `@/lib/sa-id-server` |

### 5. `RegistrationForm` now uses lib functions

`src/components/forms/RegistrationForm.tsx` had inline SA ID parsing and age validation duplicating `parseSaIdBirthDate` and `isAtLeastAge`. The inline logic has been replaced with imports from `@/lib/sa-id`.

### 6. Leaderboard API routes use `normalizeDesiredLeaderboard`

Both leaderboard API routes were calling `.toUpperCase()` on the `leaderboardId` path parameter instead of using the shared `normalizeDesiredLeaderboard` from `@/lib/leaderboard`, which also strips non-alphanumeric characters.

| File | Change |
|---|---|
| `src/app/api/leaderboard/[leaderboardId]/route.ts` | Replaced `.toUpperCase()` with `normalizeDesiredLeaderboard` |
| `src/app/api/leaderboard/[leaderboardId]/week/[weekId]/route.ts` | Replaced `.toUpperCase()` with `normalizeDesiredLeaderboard` |

### 7. JSX component name fix in catch-all dispatcher

`leaderboardDetailComponent` and `leaderboardWeekDetailComponent` were used as JSX element names in `[...slug]/page.tsx`. JSX treats lowercase names as HTML elements, not React components — this caused TypeScript errors and the components would not render.

| File | Change |
|---|---|
| `src/app/routes.ts` | Renamed exports to `LeaderboardDetailComponent` and `LeaderboardWeekDetailComponent` |
| `src/app/[...slug]/page.tsx` | Updated import and JSX usage to match new PascalCase names |

### 8. Inline documentation added

Concise `//` comments added before every function across all `src/lib/` files, `src/app/routes.ts`, and `src/app/[...slug]/page.tsx` explaining what each function is used for.
