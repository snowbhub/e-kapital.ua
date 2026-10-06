import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "єКапітал — навігатор особистого капіталу",
    short_name: "єКапітал",
    description: "Ваш бюджет, резерв, цілі та власні сценарії.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f3f4f8",
    theme_color: "#f3f4f8",
    lang: "uk",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
