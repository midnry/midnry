import { createContext } from "react";

export const MIN_LOADING_MS = 3000;

export type LoadingDetails = {
  title?: string;
  icon?: string;
  progress?: number;
  error?: string;
};

export const GameLoadingContext = createContext<{
  visible: boolean;
  register: (id: symbol, details: LoadingDetails) => void;
  unregister: (id: symbol) => void;
} | null>(null);
