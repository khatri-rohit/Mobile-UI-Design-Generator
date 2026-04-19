import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
