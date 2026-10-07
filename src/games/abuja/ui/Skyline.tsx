/** The sunset skyline shared by the game title and its loading screen. */
export function Skyline({
  className = "abuja-loading__city",
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg className={className} viewBox="0 0 600 200" fill="none" aria-hidden="true">
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
      <path d="M342 180V71L374 58L387 71V180Z" fill="#284657" stroke="#64818a" strokeWidth="2" />
      <path d="M352 81V157M364 77V157M377 80V157" stroke="#d8b87a" strokeWidth="3" opacity=".6" />
      <path
        d="M36 145H43M54 145H61M97 118H104M116 118H123M97 139H104M116 139H123M417 111H424M434 111H441M417 133H424M434 133H441M477 140H484M492 140H499"
        stroke="#efc17a"
        strokeWidth="4"
      />
      <path d="M0 181H600" stroke="#6c8c88" strokeWidth="2" />
      <path d="M0 195H600" stroke="#efc17a" strokeOpacity=".4" strokeDasharray="18 20" />
      <g
        className={animated ? "abuja-loading__taxi" : undefined}
        style={animated ? undefined : { transform: "translateX(410px)" }}
      >
        <path d="M0 182V171Q0 166 5 166H12L19 156H42L50 166H56Q61 166 61 171V182Z" fill="#56bd8e" />
        <path d="M18 166L23 160H38L44 166Z" fill="#102838" />
        <path d="M1 173H60" stroke="#fff0d0" strokeWidth="4" />
        <circle cx="13" cy="182" r="6" fill="#08131e" />
        <circle cx="49" cy="182" r="6" fill="#08131e" />
      </g>
    </svg>
  );
}
