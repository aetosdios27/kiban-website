// The site's canonical origin, used for share images, the sitemap and robots.
// Set NEXT_PUBLIC_SITE_URL for a custom domain. On Vercel the production URL
// is the fallback; anywhere else it falls back to localhost.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");
