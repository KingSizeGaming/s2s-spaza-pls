import { routes, type SearchParams } from '../routes';
import LeaderboardDetailPage from '@/components/pages/LeaderboardDetailPage';

interface RouteParams {
  slug: string[];
}

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

  // Handle root path
  if (slug.length === 0) {
    const rootRoute = routes[''];
    const Component = rootRoute.component as React.ComponentType<Record<string, never>>;
    return <Component />;
  }

  const route = routes[firstSegment];

  // Route not found
  if (!route) {
    return <NotFound />;
  }

  // Handle special case: leaderboard with nested routes
  if (firstSegment === 'leaderboard' && route.nestedMatcher) {
    const nestedMatch = route.nestedMatcher(slug);

    if (!nestedMatch.success) {
      return <NotFound />;
    }

    // If it's a nested leaderboard detail route
    if (nestedMatch.component === 'leaderboard-detail' && nestedMatch.params) {
      const { leaderboardId, weekId } = nestedMatch.params;
      return (
        <LeaderboardDetailPage
          params={Promise.resolve({ leaderboardId, weekId })}
          searchParams={
            resolvedSearchParams
              ? Promise.resolve(resolvedSearchParams as unknown as SearchParams)
              : undefined
          }
        />
      );
    }

    // Root leaderboard
    const LeaderboardComponent = route.component as React.ComponentType<{
      searchParams?: Promise<SearchParams>;
    }>;
    return (
      <LeaderboardComponent
        searchParams={
          resolvedSearchParams
            ? Promise.resolve(resolvedSearchParams as unknown as SearchParams)
            : undefined
        }
      />
    );
  }

  // Handle token-based routes (p, predict, r, register)
  if (route.requiresParams && slug[1]) {
    const token = slug[1];
    const TokenComponent = route.component as React.ComponentType<{
      params: Promise<{ token: string }>;
    }>;
    return (
      <TokenComponent
        params={Promise.resolve({ token })}
      />
    );
  }

  // Handle simple routes (demo, admin, health)
  const SimpleComponent = route.component as React.ComponentType<Record<string, never>>;
  return <SimpleComponent />;
}
