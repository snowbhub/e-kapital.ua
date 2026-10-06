import type { MetadataRoute } from "next";
import { articles } from "@/lib/content";
import { siteUrl } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    ...Object.keys(articles),
    "assets",
    "data-sources",
    "privacy",
    "legal",
    "finansova-gramotnist",
  ].map((slug) => ({
    url: `${siteUrl()}/${slug}`,
    changeFrequency: "weekly",
    priority: slug ? 0.7 : 1,
  }));
}
