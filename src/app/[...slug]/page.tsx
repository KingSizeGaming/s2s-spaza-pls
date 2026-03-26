import { routes, LeaderboardDetailComponent, LeaderboardWeekDetailComponent, type SearchParams } from '../routes';

interface RouteParams {
  slug: string[];
}

// Displayed when no route matches the current slug.
function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-lg text-gray-600 mt-2">Page not found</p>
      </div>
    </div>
  );
}

// Single catch-all route that handles every page in the app.
// Reads slug[0] from the URL, looks it up in routes.ts, and renders the matching component.
// Supports simple routes, token-based routes (/p/:token), and nested leaderboard paths.
export default async function CatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const slug = resolvedParams.slug || [];
  const firstSegment = slug[0] || '';

  const resolvedSearch = resolvedSearchParams
    ? Promise.resolve(resolvedSearchParams as unknown as SearchParams)
    : undefined;

  // Root path
  if (slug.length === 0) {
    const RootComponent = routes[''].component as React.ComponentType<Record<string, never>>;
    return <RootComponent />;
  }

  const route = routes[firstSegment];
  if (!route) return <NotFound />;

  // Leaderboard with nested routes
  if (firstSegment === 'leaderboard' && route.nestedMatcher) {
    const nestedMatch = route.nestedMatcher(slug);
    if (!nestedMatch.success) return <NotFound />;

    // /leaderboard/[leaderboardId]/week/[weekId]
    if (nestedMatch.component === 'leaderboard-week' && nestedMatch.params) {
      const { leaderboardId, weekId } = nestedMatch.params;
      return (
        <LeaderboardWeekDetailComponent
          params={Promise.resolve({ leaderboardId, weekId })}
          searchParams={resolvedSearch}
        />
      );
    }

    // /leaderboard/[leaderboardId]
    if (nestedMatch.component === 'leaderboard-detail' && nestedMatch.params) {
      const { leaderboardId } = nestedMatch.params;
      return (
        <LeaderboardDetailComponent
          params={Promise.resolve({ leaderboardId })}
          searchParams={resolvedSearch}
        />
      );
    }

    // /leaderboard (root)
    const LeaderboardComponent = route.component as React.ComponentType<{
      searchParams?: Promise<SearchParams>;
    }>;
    return <LeaderboardComponent searchParams={resolvedSearch} />;
  }

  // Token-based routes (p, predict, r, register)
  if (route.requiresParams && slug[1]) {
    const TokenComponent = route.component as React.ComponentType<{
      params: Promise<{ token: string }>;
    }>;
    return <TokenComponent params={Promise.resolve({ token: slug[1] })} />;
  }

  // Simple routes (demo, admin, health)
  const SimpleComponent = route.component as React.ComponentType<Record<string, never>>;
  return <SimpleComponent />;
}
