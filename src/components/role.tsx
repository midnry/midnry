import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getRole } from "@/lib/community.functions";

type RoleValue = { isAdmin: boolean; ready: boolean };

const RoleContext = createContext<RoleValue>({ isAdmin: false, ready: false });

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setIsAdmin(false);
      setReady(true);
      return;
    }
    let cancel = false;
    setReady(false);
    getRole()
      .then((role) => {
        if (!cancel) setIsAdmin(role.isAdmin);
      })
      .catch(() => {
        if (!cancel) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancel) setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, [user?.id, isPending]);

  const value = useMemo(() => ({ isAdmin, ready: isPending ? false : ready }), [isAdmin, ready, isPending]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
