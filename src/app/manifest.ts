import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "єКапітал — навігатор особистого капіталу",
    short_name: "єКапітал",
    description:
      "Готові фінансові варіанти з урахуванням податків та інфляції.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f3f4f8",
    theme_color: "#f3f4f8",
    lang: "uk",
    icons: [
      {
        src: "/icons/wallet-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/wallet-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/wallet-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
