import { ComponentType } from 'react';
import HomePage from '@/components/pages/HomePage';
import DemoPage from '@/components/pages/DemoPage';
import AdminPage from '@/components/pages/AdminPage';
import HealthPage from '@/components/pages/HealthPage';
import LeaderboardPage from '@/components/pages/LeaderboardPage';
import LeaderboardDetailPage from '@/components/pages/LeaderboardDetailPage';
import PredictionPage from '@/components/pages/PredictionPage';
import PredictPage from '@/components/pages/PredictPage';
import RegistrationPage from '@/components/pages/RegistrationPage';
import RegisterPage from '@/components/pages/RegisterPage';

export interface SearchParams {
  weekId?: string;
  token?: string;
  [key: string]: string | string[] | undefined;
}

type SimpleComponent = ComponentType<Record<string, never>>;
type ParamsComponent<T extends Record<string, string>> = ComponentType<{ params: Promise<T> }>;
type ParamsSearchComponent<T extends Record<string, string>> = ComponentType<{
  params: Promise<T>;
  searchParams?: Promise<SearchParams>;
}>;

type TokenParams = { token: string };
type LeaderboardParams = { leaderboardId: string; weekId: string };

type ComponentUnion =
  | SimpleComponent
  | ParamsComponent<TokenParams>
  | ParamsComponent<LeaderboardParams>
  | ParamsSearchComponent<Record<string, string>>;

export interface NestedMatchResult {
  success: boolean;
  params?: Record<string, string>;
  component?: string;
}

export interface RouteConfig {
  component: ComponentUnion;
  requiresParams?: boolean;
  requiresSearchParams?: boolean;
  nestedMatcher?: (slug: string[]) => NestedMatchResult;
}

export const routes: Record<string, RouteConfig> = {
  // Root
  '': {
    component: HomePage as SimpleComponent,
  },

  // Simple routes
  demo: {
    component: DemoPage as SimpleComponent,
  },
  admin: {
    component: AdminPage as SimpleComponent,
  },
  health: {
    component: HealthPage as SimpleComponent,
  },

  // Leaderboard routes (complex with nested paths)
  leaderboard: {
    component: LeaderboardPage as ParamsSearchComponent<Record<string, string>>,
    requiresSearchParams: true,
    nestedMatcher: (slug): NestedMatchResult => {
      const [, leaderboardId, third, weekId] = slug;

      // /leaderboard/[leaderboardId]/week/[weekId]
      if (third === 'week' && weekId) {
        return {
          success: true,
          params: { leaderboardId, weekId },
          component: 'leaderboard-detail',
        };
      }

      // /leaderboard/[leaderboardId]
      if (leaderboardId && slug.length === 2) {
        return {
          success: true,
          params: { leaderboardId, weekId: '' },
          component: 'leaderboard-detail',
        };
      }

      // /leaderboard (root)
      if (slug.length === 1) {
        return { success: true };
      }

      return { success: false };
    },
  },

  // Token-based routes
  p: {
    component: PredictionPage as ParamsComponent<{ token: string }>,
    requiresParams: true,
  },
  predict: {
    component: PredictPage as ParamsComponent<{ token: string }>,
    requiresParams: true,
  },
  r: {
    component: RegistrationPage as ParamsComponent<{ token: string }>,
    requiresParams: true,
  },
  register: {
    component: RegisterPage as ParamsComponent<{ token: string }>,
    requiresParams: true,
  },
};

// Special case for leaderboard detail
export const leaderboardDetailRoute = {
  component: LeaderboardDetailPage as ParamsSearchComponent<{
    leaderboardId: string;
    weekId: string;
  }>,
  requiresParams: true,
  requiresSearchParams: true,
};
