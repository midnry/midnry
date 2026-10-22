import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AccountProvider } from "@/components/account";
import { FavoritesProvider } from "@/components/favorites";
import { RoleProvider } from "@/components/role";
import { Shell } from "@/components/shell";
import { APP_NAME, SITE_DESCRIPTION } from "@/lib/catalog";
import { ToasterMount } from "@/components/toaster";
import { Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { DayModeSync } from "@/components/day-mode";
import { MODE_SCRIPT } from "@/lib/day-mode";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${APP_NAME} — a desk of web apps` },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: `${APP_NAME} — a desk of web apps` },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${APP_NAME} — a desk of web apps` },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: "/og.jpg" },
      { name: "theme-color", content: "#f4f7fb" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,500&family=Outfit:wght@400;500;600&display=swap",
      },
      // Icons (drawn by scripts/brand/build-logo.mjs). Stable paths; bump ?v= only when the art changes.
      // Search uses the 96 px PNG or the ICO (a multiple of 48 px); browsers that can take the SVG prefer it.
      // Declaring our own apple-touch-icon and manifest stops the platform PWA injector adding its placeholders.
      { rel: "icon", href: "/favicon.ico?v=3", sizes: "16x16 32x32 48x48" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png?v=3" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=3" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=3" },
      { rel: "manifest", href: "/site.webmanifest?v=3" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: APP_NAME,
                  description: SITE_DESCRIPTION,
                },
                {
                  "@type": "WebSite",
                  name: APP_NAME,
                  description: SITE_DESCRIPTION,
                  inLanguage: "en",
                },
              ],
            }),
          }}
        />
      </head>
      <body>
        <PreviewHostBridge />
        <DayModeSync />
        <AuthProvider>
          <AccountProvider>
            <FavoritesProvider>
              <RoleProvider>
                <Outlet />
                <ToasterMount />
              </RoleProvider>
            </FavoritesProvider>
          </AccountProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <Shell>
      <h1 className="font-display text-4xl tracking-tight">That page is not on the desk.</h1>
      <p className="mt-3 text-muted">The link may be old, or the tool was never here.</p>
      <Link to="/" className="mt-6 inline-flex min-h-11 items-center text-sm underline">
        Back home
      </Link>
    </Shell>
  );
}
