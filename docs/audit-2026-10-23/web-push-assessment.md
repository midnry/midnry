# Web Push reminders for Remind: feasibility assessment

Date researched: **23 Oct 2026**. Every source below was read on 23 Oct 2026.
Scope: adding Web Push (Push API + Notifications API + service worker) reminders to Midnry's Remind app. Midnry is a TanStack Start/React app on a Node server, hosted on Render's free web service with free Render Postgres. Most users are on Android phones in Nigeria, some on iPhones.
Policy: only official vendor or standards sources were used (MDN, MDN browser-compat-data, WebKit, Apple Developer, web.dev, Chrome for Developers, Chromium/Google blogs, Android Developers, Firebase, Mozilla autopush, Render, GitHub Docs, Resend, cron-job.org, npm registry). caniuse appears only as a secondary source. Anything not confirmed on an official page is marked **UNVERIFIED**.

---

## Summary

- **Android works well, with one gap: Opera Mini.** Chrome for Android, Samsung Internet and Firefox for Android all support Push and service workers. On Android a push wakes the browser even when it is closed. Opera Mini supports none of these APIs (caniuse; Opera's own documentation says its JavaScript runs on Opera's servers and Web Workers are disabled). Android in-app browsers built on WebView also lack support. Some Nigerian users will therefore need the existing email fallback.
- **iPhone works only after "Add to Home Screen".** Users need iOS/iPadOS **16.4+**. The site must have a manifest with `display: standalone` or `fullscreen`, the user must add it to the Home Screen, and the permission request must come from a tap. A plain Safari tab never gets push. iOS does not fire `pushsubscriptionchange`. Safari **revokes permission** if a push arrives and no notification is shown.
- **Delivery is best-effort, and permission is one-shot.** If a user blocks the prompt, the site cannot ask again; they must change it in browser settings. Android Doze can delay normal-priority messages, so reminders should be sent with `Urgency: high` and a short TTL. Chrome may silently remove permission from low-engagement sites (installed web apps are exempt). Chrome 155+ on Android also has a new non-blocking prompt that can time out and resolve to `default`.
- **Sending pushes costs nothing, but the scheduler cannot live inside the free Render service.** FCM is "No-cost". Apple requires no Developer Program membership. Mozilla autopush has no published price (UNVERIFIED). The `web-push` npm package is widely used (about 6.6 M downloads/week) but has had **no release since 3.6.7 (16 Jan 2024)**. Render free services spin down after **15 min** without traffic and "might restart … at any time", so an in-process timer is not reliable.
- **Cheapest reliable setup: about $7–13/month.**
  - A Render Cron Job (Starter, $0.00016/min, $1 minimum) that sends due reminders every 1–5 min costs about **$1–7/mo**.
  - *Update 23 Oct 2026: the live database is already on the paid `0.5c-1g` plan (owner's dashboard), so the free-database expiry below does not apply to Midnry.*
  - Upgrading Postgres to Basic-256mb costs **$6/mo**. The **free Render Postgres expires 30 days after creation** (14-day grace, no backups), which is a bigger reliability risk than the scheduler.
  - A $0 option exists: cron-job.org (free, every 1 min) pinging an endpoint on the free service. It keeps the service awake (about 744 of the 750 free hours) but stays fragile.
  - GitHub Actions is a poor fit: 5-min minimum interval, and runs can be delayed or dropped.
  - Resend's free plan is **100 emails/day and 3,000/month**.

---

## 1. Browser support (Push API + Notifications + service workers)

Primary data: MDN browser-compat-data (BCD), read from `github.com/mdn/browser-compat-data` `main` (v8.1.7). This is the data behind MDN's compatibility tables. "Mirror" means a browser inherits the upstream Chromium version. Samsung Internet mirrors Chrome Android (Chrome 42 ≈ Samsung Internet 4.0, per BCD's Notification entry).

| Browser | Push in a browser tab | Push when browser closed | Install required | Min version (PushManager / push) | Source |
|---|---|---|---|---|---|
| Chrome for Android | Yes. Notifications only via `ServiceWorkerRegistration.showNotification()`, not `new Notification()`. | **Yes.** Android wakes the browser on a push (web.dev FAQ). | No | Chrome 42 | MDN BCD `PushManager`, `Notification`; web.dev push FAQ |
| Samsung Internet (Android) | Yes, service-worker notifications only | Probably yes (Chromium-based, same Android wake path). **UNVERIFIED**: no Samsung page confirms it. | No | 4.0 (BCD mirror of Chrome 42) | MDN BCD |
| Firefox for Android | Yes. `subscribe()`/`requestPermission()` must be called from a user gesture (Firefox Android 79+). | Probably yes. Mozilla autopush documents "bridged" (FCM) delivery for mobile. **UNVERIFIED**: no explicit official statement found. | No | Firefox Android 48 | MDN BCD `PushManager.subscribe`; autopush HTTP docs |
| Opera for Android (full browser, not Mini) | Yes, service-worker notifications only | Probably yes (Chromium-based). **UNVERIFIED**. | No | PushEvent: Opera Android 37 | MDN BCD |
| **Opera Mini** | **No.** caniuse: Push API, Notifications and Service Workers all "not supported" for `op_mini all`. Opera's own documentation: page JS runs on Opera's transcoding servers, timers are limited to about 5 s, "Web Workers are disabled", and localStorage/offline storage don't work. | No | n/a | Not supported | caniuse (secondary); help.opera.com "Opera Mini and JavaScript". Support in Opera Mini's non-Extreme modes is **UNVERIFIED**. |
| Android WebView (in-app browsers inside other apps) | **No** (`version_added: false` for PushManager, Notification, showNotification) | No | n/a | Not supported | MDN BCD |
| iOS / iPadOS Safari, normal tab | **No.** The `Notification` interface is undefined unless the page runs as a Home Screen web app. | No | **Yes, Add to Home Screen** | n/a | MDN BCD `Notification` (safari_ios note) |
| iOS / iPadOS Home Screen web app | Yes, inside the installed web app. The manifest must have a non-default `display` (`standalone` or `fullscreen`). Permission only "in response to direct user interaction". | Yes. Notifications arrive like native app notifications and respect Focus modes (WebKit). | **Yes** | **iOS/iPadOS 16.4** | WebKit blog 13878; MDN BCD `PushManager` safari_ios 16.4; Apple Developer doc |
| iOS third-party browsers (Chrome/Firefox/Edge for iOS) | No in-tab push (BCD `webview_ios: false`). They can offer Add to Home Screen; the resulting web app gets push. | Same as iOS web app | Yes | iOS 16.4 | WebKit blog 13878; MDN BCD |
| Desktop Chrome | Yes | Only while the browser process is running, even with no windows open. A fully quit browser receives nothing. | No | Chrome 42 | MDN BCD; web.dev push FAQ |
| Desktop Edge | Yes | As for Chrome (needs the browser process). **UNVERIFIED** for Edge specifically. | No | Edge 17 | MDN BCD |
| Desktop Firefox | Yes. User gesture required (Firefox 72+). | Needs the browser process running (web.dev general desktop statement) | No | Firefox 44 | MDN BCD; web.dev push FAQ |
| Desktop Safari (macOS) | Yes | Behaviour when Safari is fully quit is **UNVERIFIED** | No | Safari 16 on **macOS 13 Ventura+** | MDN BCD; Apple Developer doc |

Related support facts:
- **`pushsubscriptionchange` event:** Chrome 138+ (and Android Chromium browsers via mirror). Firefox has it only partially (no `oldSubscription`/`newSubscription`). Desktop Safari 16. **iOS Safari: not supported.** (MDN BCD `ServiceWorkerGlobalScope.pushsubscriptionchange_event`.) The client therefore has to re-sync its subscription with the server every time the app opens.
- **Declarative Web Push (Apple):** from iOS/iPadOS 18.4 and macOS (Safari 18.5), a push can carry a JSON `web_push` payload that WebKit displays without running a service worker. Browsers without it fall back to the normal JavaScript path. WebKit introduced it because service-worker failures and ITP data removal could break push silently (WebKit blog 16535). Optional, but useful for iOS reliability.
- **Secure context:** HTTPS only (MDN `Notification.requestPermission`).

---

## 2. Permission rules

- **User gesture:**
  - Safari/iOS: permission can be requested only "in response to direct user interaction" (WebKit blog 13878). Apple: "call the push subscription method immediately from the gesture's event handler" (Apple Developer doc).
  - Firefox 72+ desktop and Firefox Android 79+: `requestPermission()` and `subscribe()` work only inside a user gesture (MDN BCD notes).
  - Chrome doesn't strictly require a gesture, but web.dev reports prompts without prior interaction are accepted only **12%** of the time, versus **30%** after interaction. Its guidance is "Never ask on page load or without user interaction" (web.dev permissions-best-practices).
  - Design: put an explicit "Turn on phone reminders" button inside Remind.
- **Chrome quieter permission UI (Chrome 80+):**
  - Users can opt in themselves.
  - It turns on automatically for users who usually block prompts.
  - Sites with "very low acceptance rates" are enrolled automatically, and unenrolled once acceptance improves (Chromium blog, 7 Jan 2020).
  - Users can enable "Use quieter messaging". The prompt then shows only as a message under the address bar (Chrome Help 3220216, Android).
- **Abusive notifications and auto-revocation:**
  - Chrome may remove permission from sites it finds "disruptive" (Chrome Help).
  - Since Oct 2025, Chrome on Android and desktop also auto-revokes permission for sites with "very low user engagement" that send many notifications. **Installed web apps are excluded** (Google blog, 10 Oct 2025).
  - Since Jan 2026, Chrome rate-limits push for flagged high-volume, low-engagement sites. Flagged sites get HTTP 429. Penalties last 1 / 7 / 14 days for repeat offences and reset after 42 clean days (Chrome for Developers, 6 Jan 2026). A reminder app sending only user-requested reminders should not be affected.
- **Chrome 155+ on Android:**
  - A lighter, non-blocking prompt. If the user ignores it, `requestPermission()` resolves to **`default`**, not `denied`.
  - Users can subscribe later from Site Controls.
  - Recommendation: subscribe only on `'granted'`, and listen to `navigator.permissions.query({name:'notifications'})` `onchange` (Chrome for Developers, 22 Jul 2026).
- **Android 13+ OS permission:**
  - Android 13 (API 33) introduced the `POST_NOTIFICATIONS` runtime permission. Apps' notifications are "off by default" on new installs, and if the user picks "don't allow" the app "can't send notifications" (Android Developers, notification-permission, updated 16 Oct 2026).
  - Chrome and the other browsers are Android apps, so the browser itself needs this permission before any site notification can appear. No Chrome-specific official page confirming the interaction was found. **UNVERIFIED** as to exact Chrome behaviour.
- **iOS:**
  - The prompt exists only inside the Home Screen web app, after a tap (WebKit 13878).
  - Users manage permission per web app in iOS Settings → Notifications.
- **After denial:**
  - "Once a user has permanently denied access … browsers honor that decision". Recovery "intentionally takes effort" (web.dev permissions-best-practices).
  - If the user clicks Block, the app cannot ask again and the user must unblock it manually (web.dev subscribing-a-user).
  - Chrome Android path: Page info → Permissions → Notifications → Allow (Chrome Help).
  - Remind should detect `Notification.permission === 'denied'`, show how to unblock, and keep the email fallback.

---

## 3. Delivery limitations

- **Best-effort.** Autopush "should only return a 201", with no delivery receipts (autopush HTTP docs). Apple stores undelivered notifications only up to the TTL (at most 30 days), and only a limited number per offline device (Apple Developer doc). No push service guarantees on-time delivery to a sleeping or offline phone.
- **Headers (RFC 8030, per web.dev and Apple):**
  - `TTL` is required.
  - `Urgency` is one of `very-low | low | normal | high`. The default is `normal`. Apple: "To attempt to deliver the notification immediately, specify high."
  - `Topic` (at most 32 chars) replaces a pending message that has the same topic.
  - For reminders, use `Urgency: high`, a TTL of about 1–6 h (a stale reminder is worse than none), and `Topic` = reminder id.
- **Android Doze / battery:**
  - In Doze, Android "Suspends network access" until maintenance windows (Android Developers doze-standby, updated 22 Oct 2026).
  - For FCM: "When the device is in Doze mode, delivery may be delayed…" for normal priority. High priority can "wake a sleeping device". High-priority messages that don't produce visible notifications "may be deprioritized to normal priority" (Firebase message-priority, updated 22 Oct 2026).
  - How web-push `Urgency` maps to FCM Android priority is **UNVERIFIED** (not documented on the pages read).
  - OEM battery savers common on budget Android phones (aggressive app-killing) can add further delay. **UNVERIFIED**: no official page.
- **Must show a notification for every push:**
  - Chrome requires `userVisibleOnly: true` ("You must pass a value of true") (web.dev subscribing-a-user).
  - Safari "doesn't support invisible push notifications … If you don't, Safari revokes the push notification permission" (Apple Developer doc).
  - Firefox limits pushes that don't show a notification with a quota (MDN Push API).
  - Chrome's generic "site has been updated in the background" fallback notification is **UNVERIFIED** (not on an official page read).
- **Browser closed:**
  - Android: works (the OS wakes the browser).
  - Desktop: works only while the browser process runs (web.dev push FAQ).
  - iOS: works for Home Screen web apps.
- **Payload size:**
  - Push services must accept at least **4096 bytes** (web.dev). Apple's limit is 4 KB.
  - Mozilla bridged (mobile) connections may be limited to **2744 bytes** (autopush HTTP docs).
  - Keep payloads to title, body and URL, well under 2 KB.
- **Subscription expiry and rotation:**
  - `expirationTime` exists. `pushsubscriptionchange` is not fired on iOS, and Chrome fires it only from version 138.
  - The server must delete subscriptions that return **404 or 410** (web.dev; Apple: 410 "device token has expired"). The client should re-check and re-post its subscription each time Remind opens.
  - Revoking permission auto-unsubscribes the user.
- **Rate limits:**
  - 429 means a push-service rate limit, and should come with a `Retry-After` header (web.dev).
  - Apple returns 429 for "too many consecutive requests to the same device token", and asks senders to keep at most 100 unacknowledged HTTP/1.1 requests per connection and not to refresh the VAPID JWT more than once an hour (Apple Developer doc).
- **iOS-specific:**
  - Push works only in Home Screen web apps.
  - Silent pushes are punished by permission revocation.
  - No `pushsubscriptionchange`.
  - ITP can delete website data, including the service worker registration, for sites not visited in a while, which breaks the subscription (WebKit blog 16535). Declarative Web Push on iOS 18.4+ mitigates this.

---

## 4. Server side and costs

- **VAPID (RFC 8292):**
  - Generate one P-256 key pair and keep the private key in an env var (e.g. `VAPID_PRIVATE_KEY`).
  - The public key goes to `subscribe({applicationServerKey})`. Chrome and Edge require it (MDN BCD note).
  - Apple: the JWT `sub` must be a URL or `mailto:`, and `exp` can be no more than 1 day ahead (Apple Developer doc). The web-push README warns that a localhost `mailto:` subject may be rejected by Apple, so use `mailto:support@midnry.com` or `https://midnry.com`.
  - Firewall: allow `https://*.push.apple.com`.
- **Push services:** the endpoint URL comes from the browser. Chrome uses FCM, Firefox uses Mozilla autopush, Safari/iOS uses Apple's web push service. The sender just POSTs to whatever endpoint the subscription gives.

| Item | Cost / limits (official) | Source |
|---|---|---|
| FCM (Chrome, Samsung, Opera Android endpoints) | **"No-cost"** (listed under no-cost products on Spark; product table shows FCM as No-cost). No web-push quota published, apart from Chrome's flagged-site limit (1,000 msgs/min, then 429). | firebase.google.com/pricing; developer.chrome.com/blog/web-push-rate-limits |
| Apple web push service | No Apple Developer Program membership needed. No price published, so **$0 assumed (UNVERIFIED as a formal statement)**. 429 if too many requests to one device; at most 100 unacked HTTP/1.1 requests per connection. | Apple Developer doc |
| Mozilla autopush (Firefox endpoints) | No pricing or quota page found. Free in practice, **UNVERIFIED**. Firefox applies a client-side quota only to pushes without a notification. | autopush-rs docs; MDN Push API |
| `web-push` npm (Node) | Free, MPL-2.0, Node ≥16. Latest **3.6.7, published 16 Jan 2024** (no release in about 21 months). About 6.57 M downloads in the week 12–18 Oct 2026. GitHub repo not archived; 36 open issues, 12 open PRs; no maintenance notice. Small dependency set (`http_ece`, `jws`, `asn1.js`, `https-proxy-agent`, `minimist`). Verdict: widely used and stable, but slow-moving. Pin the version and wrap it so it can be swapped. | registry.npmjs.org/web-push; api.npmjs.org downloads; github.com/web-push-libs/web-push |
| Resend (existing email reminders) | **Free plan: 3,000 emails/month, limited to 100/day**, 3 domains, 1 webhook endpoint, 30-day retention. **Pro: $20/mo for 50,000 emails/month**, then $0.90 per 1,000 with pay-as-you-go. | resend.com/pricing |
| Render free web service | $0. Spins down after 15 min idle, about 1 min to wake. 750 free instance-hours per workspace per month, after which free services are suspended until next month. "Might restart … at any time". Outbound SMTP ports 25/465/587 blocked, so Resend's HTTP API is required, which Midnry already uses. | render.com/docs/free |
| Render free Postgres | $0. **Expires 30 days after creation**, 14-day grace, then deleted. 1 GB storage. No backups. One per workspace. | render.com/docs/free; render.com/pricing |
| Render Postgres Basic-256mb (cheapest paid) | **$6/month** (0.1 CPU, 256 MB RAM, 100 connections) | render.com/pricing |
| Render Starter web service (cheapest paid, always-on) | **$7/month** (512 MB, 0.5 CPU) | render.com/pricing |
| Render Cron Job | **From $1/month** (minimum charge per cron job service). Starter instance **$0.00016/minute**, billed per second of run time. UTC schedules. If a run overlaps, the next scheduled run is delayed. 12 h max run. | render.com/pricing; render.com/docs/cronjobs |
| Render workspace plan | Hobby: $0/mo + compute | render.com/pricing |

---

## 5. Scheduling options on Render (monthly cost and reliability)

**Why an in-process timer fails:** the free web service "spins down" after "15 minutes without receiving any inbound traffic" and "might restart … at any time" (render.com/docs/free). A `setTimeout`/`node-cron` inside the web process misses every reminder due while the service is asleep, and loses its schedule on restart.

Robust pattern for every option:
1. Store `due_at` in Postgres.
2. A "dispatch due reminders" job runs every N minutes.
3. It atomically claims rows with `due_at <= now() AND sent_at IS NULL` (e.g. `UPDATE … RETURNING`, or `FOR UPDATE SKIP LOCKED`).
4. It sends the push (and/or the Resend email for Pass users), records `sent_at`, and deletes subscriptions that returned 404/410.

| Option | How | Est. monthly cost (USD) | Reliability | Notes |
|---|---|---|---|---|
| **A. Render Cron Job** (recommended) | Separate Render cron job runs a Node script every 1–5 min that queries Postgres and sends pushes and emails directly, without waking the web service | Every 5 min: about 8,640 runs. At 15–30 s each that is $0.35–0.69, so the **$1 minimum** applies. Every 1 min: about 43,200 runs, roughly **$1.73–6.91** at 15–60 s/run. | Good. Platform-scheduled, no dependence on the free web service. Precision is ±(interval + start-up time). | Per-run start-up time and billing granularity in practice are **UNVERIFIED**; the estimates assume Starter at $0.00016/min. Overlapping runs are delayed, not doubled. |
| **B. Paid always-on web service** | Upgrade Midnry's web service to Starter, then run an in-process minute ticker (still DB-backed) | **$7** | Good. No spin-down. A deploy or restart briefly pauses the ticker, but the DB-backed catch-up handles it. | Also removes the 1-min cold start for users, a UX win. |
| **C. cron-job.org → endpoint on the free service** | Free external pinger calls `POST /api/cron/dispatch` (secret header) every 1 min | **$0** | Fair. Pinging every minute keeps the service awake, using about 744 h of the 750 free hours if it's the only free service in the workspace. Cold starts take about 1 min but cron-job.org times out at **30 s**, so a run can fail while still waking the service; the next minute's run succeeds. A job is auto-disabled after more than 25 consecutive failures. Render may restart the service at any time. | Whether Render permits keep-alive pinging under its terms is **UNVERIFIED**. cron-job.org is donation-funded with no SLA. |
| **D. GitHub Actions `schedule`** | Workflow calls the endpoint | Public repo: $0. Private repo: about 8,640 runs at ≥1 billed min each (minute rounding **UNVERIFIED**) minus 2,000 free min, times $0.006, so roughly **$40** | Poor. Minimum interval 5 min. "Can be delayed during periods of high loads". "Some queued jobs may be dropped". Disabled after 60 days of inactivity on public repos. | Not suitable for user-facing reminder times |
| **Database (applies to all)** | Free Postgres expires after 30 days, then deleted after a 14-day grace; no backups | **$0 → $6** (Basic-256mb) | The free DB is the largest reliability risk: every reminder is lost when it expires | Upgrade before launch regardless of scheduler choice |

**Realistic totals:**
- **Minimum viable, no spend:** C + free DB = **$0**, but it is fragile and the DB expires.
- **Recommended:** A + Basic DB = **about $7–13/mo**.
- **Simplest code:** B + Basic DB = **$13/mo**.
- Push delivery itself adds $0 on all options.
- Email stays $0 under 100/day; Resend Pro is $20/mo if exceeded.

---

## 6. Existing email reminders (Resend)

- **Free plan:** 3,000 transactional emails/month, **capped at 100/day**, 3 custom domains (resend.com/pricing). If Pass-user reminder emails plus other transactional mail (sign-in and so on) exceed 100 on any day, sends will fail.
- **Pro:** $20/month for 50,000 emails, then $0.90/1,000 with pay-as-you-go.
- Render free services block SMTP ports 25/465/587, so Midnry must keep using Resend's HTTPS API, which `RESEND_API_KEY` implies it does.

---

## Risks

1. **Opera Mini and in-app WebView users get no push.** This likely includes a meaningful share of Nigerian users, though the share is **UNVERIFIED**: no official Nigeria browser statistics were consulted. Keep email (and in-app reminders) as the fallback, and feature-detect `'serviceWorker' in navigator && 'PushManager' in window`.
2. **iPhone friction.** Users must manually "Add to Home Screen" (Share menu) and run iOS 16.4+, so many iPhone users won't complete it. Midnry needs a correct web app manifest (`display: standalone`, icons, `id`) and an in-app install explainer.
3. **One-shot permission.** A denied prompt is permanent until the user digs into settings. Chrome's quiet UI is triggered by low acceptance, so prompt only from a contextual button.
4. **Late or missed reminders.** Delivery is best-effort; Doze, OEM battery savers, offline phones and TTL expiry can all delay or drop pushes. Communicate "reminders may be delayed" and keep email for Pass users.
5. **Silent-failure penalties.** Every push must show a notification. Otherwise Safari revokes permission and FCM deprioritises the messages.
6. **Subscription churn.** 404/410 cleanup and re-sync on every app open are mandatory, especially on iOS (no `pushsubscriptionchange`, ITP data removal).
7. **Free Render Postgres expiry (30 days) and free-service restarts.** A platform-level reliability risk independent of push.
8. **`web-push` maintenance.** No release since Jan 2024. Low risk today because the protocols are stable, but pin the version and isolate it behind a small module.
9. **Chrome policy drift.** Chrome 155's timeout-to-`default` prompt, engagement-based auto-revocation (installed web apps exempt, which favours encouraging install) and rate limits for flagged sites.
10. **Resend free 100/day cap** on the email fallback.

---

## Sources (all read 23 Oct 2026)

- WebKit: Web Push for Web Apps on iOS and iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- WebKit: Meet Declarative Web Push (27 Mar 2025): https://webkit.org/blog/16535/meet-declarative-web-push/
- WebKit Features in Safari 18.4 (search result only): https://webkit.org/blog/16574/webkit-features-in-safari-18-4/
- Apple Developer: Sending web push notifications in web apps and browsers: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers (content read via https://developer.apple.com/tutorials/data/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers.json)
- MDN Push API (modified 28 May 2025): https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- MDN Notification.requestPermission() (modified 11 Jun 2025): https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static
- MDN pushsubscriptionchange event (modified 18 Sep 2025): https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/pushsubscriptionchange_event
- MDN browser-compat-data (v8.1.7, `main`): https://github.com/mdn/browser-compat-data. Files: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/PushManager.json, …/api/Notification.json, …/api/ServiceWorkerContainer.json, …/api/ServiceWorkerRegistration.json, …/api/PushEvent.json, …/api/ServiceWorkerGlobalScope.json, …/api/PushSubscription.json
- caniuse data, **secondary only**: https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/push-api.json, …/notifications.json, …/serviceworkers.json (pages: https://caniuse.com/push-api, https://caniuse.com/notifications, https://caniuse.com/serviceworkers)
- Opera Help: Opera Mini and JavaScript: https://help.opera.com/en/opera-mini-and-javascript/
- web.dev: The Web Push Protocol (updated 20 Sep 2024): https://web.dev/articles/push-notifications-web-push-protocol
- web.dev: Subscribing a user (updated 30 Jun 2016): https://web.dev/articles/push-notifications-subscribing-a-user
- web.dev: Push notifications FAQ: https://web.dev/articles/push-notifications-faq
- web.dev: Permissions best practices (updated 17 Jun 2024): https://web.dev/articles/permissions-best-practices
- Chromium Blog: Introducing quieter permission UI for notifications (7 Jan 2020): https://blog.chromium.org/2020/01/introducing-quieter-permission-ui-for.html
- Chrome for Developers: Lighter notification prompts on Android (22 Jul 2026): https://developer.chrome.com/blog/notification-prompts-android
- Chrome for Developers: Increasing web push notification value with rate limits (6 Jan 2026): https://developer.chrome.com/blog/web-push-rate-limits
- Google blog: Reducing notification overload… automatic permission revocation (10 Oct 2025): https://blog.google/chromium/automatic-notification-permission/
- Google Chrome Help: Use notifications to get alerts (Android): https://support.google.com/chrome/answer/3220216?hl=en&co=GENIE.Platform%3DAndroid
- Android Developers: Notification runtime permission (updated 16 Oct 2026): https://developer.android.com/develop/ui/views/notifications/notification-permission
- Android Developers: Optimize for Doze and App Standby (updated 22 Oct 2026): https://developer.android.com/training/monitoring-device-state/doze-standby
- Firebase: Set and manage Android message priority (updated 22 Oct 2026): https://firebase.google.com/docs/cloud-messaging/android/message-priority
- Firebase pricing: https://firebase.google.com/pricing
- Mozilla autopush-rs docs: https://mozilla-services.github.io/autopush-rs/ and https://mozilla-services.github.io/autopush-rs/http.html
- RFC 8292 (VAPID): https://datatracker.ietf.org/doc/html/rfc8292; RFC 8030 (Web Push protocol): https://datatracker.ietf.org/doc/html/rfc8030. Cited as the standards; their text was not re-read (contents relayed via web.dev and Apple).
- npm registry, web-push: https://registry.npmjs.org/web-push (package page https://www.npmjs.com/package/web-push returned 403 to the fetcher); downloads: https://api.npmjs.org/downloads/point/last-week/web-push
- GitHub, web-push-libs/web-push: https://github.com/web-push-libs/web-push
- Render: Deploy for Free: https://render.com/docs/free
- Render pricing: https://render.com/pricing
- Render Cron Jobs: https://render.com/docs/cronjobs
- GitHub Docs: Events that trigger workflows (schedule): https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Docs: GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- cron-job.org FAQ: https://cron-job.org/en/faq/ and home: https://cron-job.org/en/
- Resend pricing: https://resend.com/pricing
