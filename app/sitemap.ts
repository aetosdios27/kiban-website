import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/kiban/site";
import { CATALOG } from "@/lib/library/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/library`, changeFrequency: "monthly", priority: 0.8 },
    ...CATALOG.map(({ slug }) => ({
      url: `${SITE_URL}/library/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/license`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
