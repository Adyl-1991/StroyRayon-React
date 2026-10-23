# Google Analytics 4 setup

The storefront loads GA4 only when all of the following are true:

- the Vite build is a production build;
- VITE_GA_MEASUREMENT_ID is a valid GA4 measurement ID; and
- the browser hostname matches VITE_SITE_URL (normally www.stroyrayon.kg).

This keeps tracking off local development and Vercel preview deployments. It also excludes /admin routes and sends page paths without query strings or hashes, so a search term or accidentally supplied personal data in a URL is not sent to GA4.

## Vercel configuration

In Vercel, open the frontend project: Settings → Environment Variables. Add:

| Name | Value | Environments |
| --- | --- | --- |
| VITE_GA_MEASUREMENT_ID | G-3GEER69DP7 | Production only |
| VITE_SITE_URL | https://www.stroyrayon.kg | Production only |

Redeploy after changing either variable because Vite embeds VITE_* values at build time. Do not add the GA measurement variable to Preview or Development.

## Verification

1. Deploy the production build, then open https://www.stroyrayon.kg in an incognito browser with extensions disabled.
2. In browser DevTools → Network, filter for googletagmanager and confirm exactly one gtag/js request after a public page loads.
3. Navigate between public SPA routes and inspect outgoing GA requests. Each new pathname should create one page_view; navigating to /admin/* must not create one.
4. In GA4, open Admin → DebugView with the Google Analytics Debugger extension enabled, or verify traffic in Reports → Realtime. Realtime can take a few minutes.

The implementation uses send_page_view: false for the initial GA config and sends page views from the router, preventing the automatic initial page view from duplicating the SPA event. There is currently no cookie-consent system in this application. This integration does not claim consent or bypass one; obtain legal/privacy approval and add a real consent-management flow before enabling analytics for traffic subject to consent requirements (including applicable EEA/UK traffic and Consent Mode v2).
