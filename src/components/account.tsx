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
import { getAccount } from "@/lib/cove.functions";
import type { AccountState } from "@/lib/access";

type AccountContextValue = {
  account: AccountState | null;
  loading: boolean;
  refresh: () => Promise<AccountState | null>;
  apply: (next: AccountState) => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getAccount();
    setAccount(next);
    return next;
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setAccount(null);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    getAccount()
      .then((next) => {
        if (!cancel) setAccount(next);
      })
      .catch(() => {
        if (!cancel) setAccount(null);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [user?.id, isPending]);

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      loading: isPending || (!!user && loading),
      refresh,
      apply: setAccount,
    }),
    [account, isPending, user, loading, refresh],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}
