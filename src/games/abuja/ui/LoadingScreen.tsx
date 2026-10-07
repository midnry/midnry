import { Component, useEffect, useState, type ReactNode } from "react";
import "./loading.css";

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
        <svg className="abuja-loading__city" viewBox="0 0 600 200" fill="none" aria-hidden="true">
          <circle cx="440" cy="62" r="42" fill="#efc17a" opacity=".9" />
          <path
            d="M0 167Q70 115 125 152Q205 65 278 150Q330 96 390 154Q470 116 600 166V200H0Z"
            fill="#172d40"
          />
          <path
            d="M24 180V132H72V180M86 180V102H133V180M145 180V145H187V180M405 180V95H450V180M464 180V124H506V180M519 180V145H575V180"
            fill="#233c50"
            stroke="#365265"
            strokeWidth="2"
          />
          <path
            d="M211 180V128H305V180M222 128Q258 76 294 128M258 99V78M200 180V87H210V180M306 180V87H316V180M197 87H213L205 70Z M303 87H319L311 70Z"
            fill="#355369"
            stroke="#64818a"
            strokeWidth="2"
          />
          <path
            d="M342 180V71L374 58L387 71V180Z"
            fill="#284657"
            stroke="#64818a"
            strokeWidth="2"
          />
          <path
            d="M352 81V157M364 77V157M377 80V157"
            stroke="#d8b87a"
            strokeWidth="3"
            opacity=".6"
          />
          <path
            d="M36 145H43M54 145H61M97 118H104M116 118H123M97 139H104M116 139H123M417 111H424M434 111H441M417 133H424M434 133H441M477 140H484M492 140H499"
            stroke="#efc17a"
            strokeWidth="4"
          />
          <path d="M0 181H600" stroke="#6c8c88" strokeWidth="2" />
          <path d="M0 195H600" stroke="#efc17a" strokeOpacity=".4" strokeDasharray="18 20" />
          <g className="abuja-loading__taxi">
            <path
              d="M0 182V171Q0 166 5 166H12L19 156H42L50 166H56Q61 166 61 171V182Z"
              fill="#56bd8e"
            />
            <path d="M18 166L23 160H38L44 166Z" fill="#102838" />
            <path d="M1 173H60" stroke="#fff0d0" strokeWidth="4" />
            <circle cx="13" cy="182" r="6" fill="#08131e" />
            <circle cx="49" cy="182" r="6" fill="#08131e" />
          </g>
        </svg>
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
