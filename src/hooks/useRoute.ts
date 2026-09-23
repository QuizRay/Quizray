import { useState, useEffect, useCallback } from 'react';

export type RouteName =
  | 'home'
  | 'category'
  | 'tests'
  | 'instructions'
  | 'quiz'
  | 'result'
  | 'profile'
  | 'history'
  | 'performance'
  | 'admin'
  | 'admin-tests'
  | 'admin-questions'
  | 'admin-categories';

export interface AppRoute {
  name: RouteName;
  params: {
    categoryId?: string;
    testId?: string;
    submissionId?: string;
  };
  hash: string;
}

function parseHash(hashString: string): AppRoute {
  const cleanHash = hashString.replace(/^#\/?/, '').trim();

  if (!cleanHash || cleanHash === 'hero' || cleanHash === 'features') {
    return { name: 'home', params: {}, hash: hashString };
  }

  const parts = cleanHash.split('/').filter(Boolean);

  // #/categories or #/categories/:id or #/category/:id
  if (parts[0] === 'category' || parts[0] === 'categories') {
    if (parts[1]) {
      return { name: 'category', params: { categoryId: parts[1] }, hash: hashString };
    }
    return { name: 'category', params: {}, hash: hashString };
  }

  // #/tests
  if (parts[0] === 'tests' && parts.length === 1) {
    return { name: 'tests', params: {}, hash: hashString };
  }

  // #/test/:id/...
  if (parts[0] === 'test' || parts[0] === 'tests') {
    const testId = parts[1];
    const action = parts[2];

    if (action === 'instructions') {
      return { name: 'instructions', params: { testId }, hash: hashString };
    }
    if (action === 'quiz') {
      return { name: 'quiz', params: { testId }, hash: hashString };
    }
    if (action === 'result') {
      return { name: 'result', params: { testId }, hash: hashString };
    }

    // Default to instructions if testId is provided without subpath
    if (testId) {
      return { name: 'instructions', params: { testId }, hash: hashString };
    }
  }

  // #/admin or #/admin/...
  if (parts[0] === 'admin') {
    if (parts[1] === 'tests') {
      return { name: 'admin-tests', params: {}, hash: hashString };
    }
    if (parts[1] === 'questions') {
      return { name: 'admin-questions', params: {}, hash: hashString };
    }
    if (parts[1] === 'categories') {
      return { name: 'admin-categories', params: {}, hash: hashString };
    }
    return { name: 'admin', params: {}, hash: hashString };
  }

  // #/profile
  if (parts[0] === 'profile') {
    return { name: 'profile', params: {}, hash: hashString };
  }

  // #/performance
  if (parts[0] === 'performance') {
    return { name: 'performance', params: {}, hash: hashString };
  }

  // #/history or #/history/:submissionId
  if (parts[0] === 'history') {
    if (parts[1]) {
      return { name: 'result', params: { submissionId: parts[1] }, hash: hashString };
    }
    return { name: 'history', params: {}, hash: hashString };
  }

  return { name: 'home', params: {}, hash: hashString };
}

export function useRoute() {
  const [route, setRoute] = useState<AppRoute>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    const normalized = path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`;
    if (window.location.hash === normalized) {
      // Force update if same hash
      setRoute(parseHash(normalized));
    } else {
      window.location.hash = normalized;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toHome = useCallback(() => navigate('#/'), [navigate]);
  const toCategory = useCallback((categoryId: string) => navigate(`#/category/${categoryId}`), [navigate]);
  const toTests = useCallback(() => navigate('#/tests'), [navigate]);
  const toInstructions = useCallback((testId: string) => navigate(`#/test/${testId}/instructions`), [navigate]);
  const toQuiz = useCallback((testId: string) => navigate(`#/test/${testId}/quiz`), [navigate]);
  const toResult = useCallback((testId: string) => navigate(`#/test/${testId}/result`), [navigate]);
  const toProfile = useCallback(() => navigate('#/profile'), [navigate]);
  const toHistory = useCallback(() => navigate('#/history'), [navigate]);
  const toHistoricalResult = useCallback((submissionId: string) => navigate(`#/history/${submissionId}`), [navigate]);
  const toPerformance = useCallback(() => navigate('#/performance'), [navigate]);
  const toAdmin = useCallback(() => navigate('#/admin'), [navigate]);
  const toAdminTests = useCallback(() => navigate('#/admin/tests'), [navigate]);
  const toAdminQuestions = useCallback(() => navigate('#/admin/questions'), [navigate]);
  const toAdminCategories = useCallback(() => navigate('#/admin/categories'), [navigate]);

  return {
    route,
    navigate,
    toHome,
    toCategory,
    toTests,
    toInstructions,
    toQuiz,
    toResult,
    toProfile,
    toHistory,
    toHistoricalResult,
    toPerformance,
    toAdmin,
    toAdminTests,
    toAdminQuestions,
    toAdminCategories,
  };
}
