import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/kiban/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/license`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
