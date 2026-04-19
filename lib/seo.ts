const DEFAULT_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl(): string {
  const rawSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "https://logic-ui-ux.vercel.app";

  if (!rawSiteUrl) {
    return DEFAULT_SITE_URL;
  }

  const siteUrl =
    rawSiteUrl.startsWith("http://") || rawSiteUrl.startsWith("https://")
      ? rawSiteUrl
      : `https://${rawSiteUrl}`;

  return normalizeSiteUrl(siteUrl);
}
