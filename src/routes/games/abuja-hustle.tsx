import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AbujaHustle } from "@/games/abuja/ui/AbujaHustle";

const MANIFEST = "/abuja-hustle.webmanifest";

export const Route = createFileRoute("/games/abuja-hustle")({
  head: () => ({
    meta: [
      { title: "Abuja Hustle — a life sim (18+)" },
      { name: "description", content: "A satirical life simulation set in Abuja, Nigeria. Grow up without privilege and chase financial freedom. For adults." },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Abuja Hustle" },
    ],
    links: [{ rel: "apple-touch-icon", href: "/abuja-hustle-180.png" }],
  }),
  component: GamePage,
});

function GamePage() {
  // The site's manifest is set in the root head. On this page, point it at the
  // game's own manifest so "Add to home screen" installs the game, full screen.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const before = { manifest: link?.href, theme: theme?.content };
    if (link) link.href = MANIFEST;
    if (theme) theme.content = "#05070c";
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/abuja-hustle-sw.js", { scope: "/games/abuja-hustle" }).catch(() => {});
    }
    return () => {
      if (link && before.manifest) link.href = before.manifest;
      if (theme && before.theme) theme.content = before.theme;
    };
  }, []);
  return <AbujaHustle />;
}
