import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AccountProvider } from "@/components/account";
import { FavoritesProvider } from "@/components/favorites";
import { RoleProvider } from "@/components/role";
import { Shell } from "@/components/shell";
import { APP_NAME } from "@/lib/catalog";
import { ToasterMount } from "@/components/toaster";
import { Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Midnry hosts a desk of web apps. Register and three are included. The rest are $5 a month.",
      },
      { name: "theme-color", content: "#f4f7fb" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,500&family=Outfit:wght@400;500;600&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
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
