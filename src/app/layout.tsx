import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./decision.css";
import { Pwa } from "@/components/pwa";
import { siteUrl } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "єКапітал — навігатор особистого капіталу",
    template: "%s | єКапітал",
  },
  description:
    "Плануйте бюджет, створюйте резерв, збирайте на житло та порівнюйте власні інвестиційні сценарії. Особисті дані залишаються на вашому пристрої.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "єКапітал", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "єКапітал",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f4f8",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body>
        <a href="#main" className="sr-only">
          Перейти до вмісту
        </a>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
