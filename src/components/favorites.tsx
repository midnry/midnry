import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listFavorites, toggleFavorite, type SpotApp } from "@/lib/spotlight.functions";

type FavoritesValue = {
  favorites: SpotApp[] | null;
  saved: (slug: string) => boolean;
  toggle: (slug: string) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [favorites, setFavorites] = useState<SpotApp[] | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setFavorites([]);
      return;
    }
    let cancel = false;
    setFavorites(null);
    listFavorites()
      .then((rows) => {
        if (!cancel) setFavorites(rows);
      })
      .catch(() => {
        if (!cancel) setFavorites([]);
      });
    return () => {
      cancel = true;
    };
  }, [user?.id, isPending]);

  const toggle = useCallback(async (slug: string) => {
    const result = await toggleFavorite({ data: slug });
    setFavorites((prev) => {
      const list = prev ?? [];
      if (!result.saved) return list.filter((item) => item.slug !== slug);
      if (list.some((item) => item.slug === slug) || !result.app) return list;
      return [result.app, ...list];
    });
  }, []);

  const value = useMemo<FavoritesValue>(
    () => ({
      favorites: user ? favorites : [],
      saved: (slug) => (favorites ?? []).some((item) => item.slug === slug),
      toggle,
    }),
    [favorites, toggle, user],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside FavoritesProvider");
  return ctx;
}
