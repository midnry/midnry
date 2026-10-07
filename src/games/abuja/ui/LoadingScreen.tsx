import { Component, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import "./loading.css";
import { Skyline } from "./Skyline";
import { GameLoadingContext } from "./loading-context";

const TIPS = [
  "Talk to people. In Abuja, your network can open the next door.",
  "Okadas are fast. Taxis give you a little more peace of mind.",
  "Watch your spending. Financial freedom starts with small choices.",
  "Explore the map to find your next opportunity.",
  "Change your look any time in the Wardrobe.",
];

/** Lightweight enough to show before the game engine or its artwork arrives. */
export function LoadingScreen({
  title = "Getting Abuja ready",
  icon = "✦",
  progress,
  error,
  overlay = false,
}: {
  title?: string;
  icon?: string;
  progress?: number;
  error?: string;
  overlay?: boolean;
}) {
  const loadingContext = useContext(GameLoadingContext);
  const register = loadingContext?.register;
  const unregister = loadingContext?.unregister;
  const id = useRef(Symbol("game-loading"));
  useEffect(() => {
    register?.(id.current, { title, icon, progress, error });
  }, [register, title, icon, progress, error]);
  useEffect(() => {
    const key = id.current;
    return () => unregister?.(key);
  }, [unregister]);
  const [tip, setTip] = useState(0);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const rotate = window.setInterval(() => setTip((n) => (n + 1) % TIPS.length), 6500);
    const timeout = window.setTimeout(() => setSlow(true), 20000);
    return () => {
      window.clearInterval(rotate);
      window.clearTimeout(timeout);
    };
  }, [title]);
  if (loadingContext) return null;
  const percent =
    progress == null ? undefined : Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <div className={`abuja-loading ${overlay ? "abuja-loading--overlay" : ""}`} aria-busy={!error}>
      <div className="abuja-loading__grain" aria-hidden="true" />
      <div className="abuja-loading__content">
        <p className="abuja-loading__eyebrow">A life sim · Abuja, Nigeria</p>
        <h1 className="abuja-loading__brand">
          Abuja
          <span>
            Hustle<span className="abuja-loading__star">✦</span>
          </span>
        </h1>
        <p className="abuja-loading__tagline">Big city. Bigger dreams.</p>
        <Skyline />
        <div className="abuja-loading__status" role={error ? "alert" : "status"} aria-live="polite">
          <span className="abuja-loading__icon" aria-hidden="true">
            {error ? "!" : icon}
          </span>
          <h2>{error ? "A small roadblock" : `${title}…`}</h2>
          <p>
            {error ??
              (slow
                ? "Taking a little longer. We're still getting things ready."
                : "Your next chapter is on its way.")}
          </p>
        </div>
        {!error ? (
          <>
            <div
              className="abuja-loading__meter"
              role="progressbar"
              aria-label={title}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className={
                  percent == null ? "abuja-loading__indeterminate" : "abuja-loading__progress"
                }
                style={percent == null ? undefined : { width: `${percent}%` }}
              />
            </div>
            <div className="abuja-loading__caption">
              <span>
                {percent == null
                  ? "Getting things ready"
                  : percent === 100
                    ? "Finishing touches"
                    : "Loading game artwork"}
              </span>
              <span aria-hidden="true">{percent == null ? "● ● ●" : `${percent}%`}</span>
            </div>
            <div className="abuja-loading__tip">
              <span>STREET SMART</span>
              <p>{TIPS[tip]}</p>
            </div>
          </>
        ) : null}
        {error || slow ? (
          <button
            className="abuja-loading__retry"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload game
          </button>
        ) : null}
      </div>
      <p className="abuja-loading__footer">Every hustle starts somewhere.</p>
    </div>
  );
}

/** Failed game chunks should offer recovery instead of a blank screen. */
export class GameLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <LoadingScreen error="We couldn't open the game. Check your connection and reload to try again." />
    ) : (
      this.props.children
    );
  }
}
