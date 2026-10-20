import { useCallback, useEffect, useRef, useState } from 'react';

/* ══════════════════════════════════════════════════════════
   ROTA POR HASH

   Antes: tab/subView/inSession eram useState — o botão "voltar"
   do Android/iOS saía do app, recarregar voltava ao início e não
   havia link para lugar nenhum.

   Agora a URL carrega o estado (#/diet, #/history, #/session) e o
   hashchange alimenta o app na direção inversa. Sem dependência
   nova, sem react-router.
   ══════════════════════════════════════════════════════════ */

export type RouteTab =
  | 'home'
  | 'stats'
  | 'evolution'
  | 'diet'
  | 'agenda'
  | 'profile'
  | 'new';

export type RouteSubView =
  | null
  | 'history'
  | 'progress'
  | 'achievements'
  | 'recovery';

export interface Route {
  tab: RouteTab;
  subView: RouteSubView;
  inSession: boolean;
}

const TABS: RouteTab[] = [
  'home',
  'stats',
  'evolution',
  'diet',
  'agenda',
  'profile',
  'new',
];

const SUB_VIEWS: Exclude<RouteSubView, null>[] = [
  'history',
  'progress',
  'achievements',
  'recovery',
];

export const DEFAULT_ROUTE: Route = {
  tab: 'home',
  subView: null,
  inSession: false,
};

function isTab(value: string): value is RouteTab {
  return (TABS as string[]).includes(value);
}

function isSubView(value: string): value is Exclude<RouteSubView, null> {
  return (SUB_VIEWS as string[]).includes(value);
}

/** '#/diet' → { tab: 'diet', ... } | '' → rota padrão */
export function parseHash(hash: string): Route {
  const segments = hash
    .replace(/^#/, '')
    .split('/')
    .map((part) => decodeURIComponent(part).trim())
    .filter(Boolean);

  const [first, second] = segments;

  if (first === 'session') {
    return { tab: 'home', subView: null, inSession: true };
  }

  if (first && isSubView(first)) {
    return { tab: 'home', subView: first, inSession: false };
  }

  if (first && isTab(first)) {
    return { tab: first, subView: null, inSession: false };
  }

  // rota antiga ou desconhecida: aceita '#/history/xyz' também
  if (second && isSubView(second)) {
    return { tab: 'home', subView: second, inSession: false };
  }

  return DEFAULT_ROUTE;
}

export function toHash(route: Route): string {
  if (route.inSession) return '#/session';
  if (route.subView) return `#/${route.subView}`;
  return `#/${route.tab}`;
}

export function sameRoute(a: Route, b: Route): boolean {
  return (
    a.tab === b.tab && a.subView === b.subView && a.inSession === b.inSession
  );
}

/**
 * Fonte de verdade da navegação. Uso no App:
 *
 *   const { tab, subView, inSession, setTab, setSubView, setInSession } = useHashRoute();
 *
 * `setTab` substitui o useState('home'), `setSubView` o useState(null)
 * e `setInSession` o useState(false). O resto do App não muda.
 */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? DEFAULT_ROUTE : parseHash(window.location.hash)
  );

  // última rota conhecida, para os setters não precisarem de dependências
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const handleHashChange = () => {
      const next = parseHash(window.location.hash);
      setRoute((prev) => (sameRoute(prev, next) ? prev : next));
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    // Normaliza a URL inicial para que recarregar caia na mesma tela.
    if (!window.location.hash) {
      window.history.replaceState(null, '', toHash(routeRef.current));
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigate = useCallback(
    (next: Route, options: { replace?: boolean } = {}) => {
      const hash = toHash(next);
      if (window.location.hash !== hash) {
        if (options.replace) {
          window.history.replaceState(null, '', hash);
        } else {
          window.location.hash = hash;
        }
      }
      setRoute((prev) => (sameRoute(prev, next) ? prev : next));
    },
    []
  );

  const setTab = useCallback(
    (tab: RouteTab) => navigate({ tab, subView: null, inSession: false }),
    [navigate]
  );

  const setSubView = useCallback(
    (subView: RouteSubView) => navigate({ ...routeRef.current, subView }),
    [navigate]
  );

  const setInSession = useCallback(
    (inSession: boolean) => navigate({ ...routeRef.current, inSession }),
    [navigate]
  );

  return { ...route, setTab, setSubView, setInSession, navigate };
}
