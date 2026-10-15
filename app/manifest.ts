import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/kiban/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kiban",
    short_name: "kiban",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "browser",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
