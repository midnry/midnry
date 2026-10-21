/** Thin line icons for Outpost Zero's menus and HUD (24×24, stroke-based,
 * coloured by `currentColor`). Plain SVG strings: no emoji, no icon font. */
const P = {
  squad: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 13.6c2.9-.3 5.4 1.6 5.4 4.6"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5s1.3-6.1 3.9-8.5z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  book: '<path d="M4 5.5c3-.9 5.7-.6 8 1v13c-2.3-1.6-5-1.9-8-1z"/><path d="M20 5.5c-3-.9-5.7-.6-8 1v13c2.3-1.6 5-1.9 8-1z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-9.6A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.3c0 5.2-7.5 9.6-7.5 9.6z"/><path d="M5.5 12.5h3l1.5-2.5 2 4 1.5-2h5"/>',
  helmet: '<path d="M4 14.5a8 8 0 0 1 16 0v1.5H4z"/><path d="M12 6.5v4.5M4 16h16l-1.2 2.5H7"/>',
  exit: '<path d="M14 4h5v16h-5"/><path d="M10 16l4-4-4-4M14 12H4"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  medkit: '<rect x="3.5" y="7.5" width="17" height="12" rx="1.5"/><path d="M9 7.5V5.5h6v2M12 10.5v6M9 13.5h6"/>',
  scissors: '<circle cx="6.5" cy="17" r="2.5"/><circle cx="6.5" cy="7" r="2.5"/><path d="M8.6 8.4L20 17M8.6 15.6L20 7"/>',
  drip: '<path d="M8 3.5h8v9a4 4 0 0 1-8 0z"/><path d="M12 16.5V21M10 7.5h4"/>',
  pill: '<rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M10.2 8.6l5.2 7.4" />',
  alert: '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5M12 17v.2"/>',
  radio: '<rect x="6" y="7.5" width="12" height="13" rx="2"/><path d="M9 7.5L15 3M9 12h6M9 15.5h6"/>',
  spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/>',
  wave: '<path d="M3 12h3l2-5 3 10 3-8 2 3h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plane: '<path d="M3 13.5l7.5-1.5L14 4h2l-1.5 8 5.5 1.5v2l-5.5-.8L13 20h-2l.5-5.5L5 15z"/>',
  fire: '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.9 3.6-5.6 4.3-10.3 3.1 2 4.4 4.3 4.4 6.6.9-.6 1.5-1.6 1.7-2.8 1.8 1.5 2.6 3.8 2.6 6.4 0 3.6-2.5 6.3-6.5 6.3z"/>',
  sand: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h9"/>',
  power: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  bomb: '<circle cx="11" cy="14" r="6.5"/><path d="M15.5 9.5l2-2M17.5 4.5v1.5M20 7h-1.5"/>',
  home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5M10 20v-5.5h4V20"/>',
  bot: '<rect x="5" y="8.5" width="14" height="10" rx="3"/><path d="M12 8.5V5.5M10.5 4.5h3M3 13v2M21 13v2"/><circle cx="9.5" cy="13.5" r="1.1"/><circle cx="14.5" cy="13.5" r="1.1"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V5.5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/>',
};

export function icon(name, cls = "") {
  const body = P[name] || P.alert;
  return `<svg class="mf-ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
