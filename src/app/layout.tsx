import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./decision.css";
import "./automatic.css";
import "./opportunities.css";
import { Pwa } from "@/components/pwa";
import { siteUrl } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "єКапітал — навігатор особистого капіталу",
    template: "%s | єКапітал",
  },
  description:
    "Порівнюйте готові депозити, валюту, ОВДП та сценарії житла. Ставки, податки й інфляція вже враховані. Особисті суми залишаються на пристрої.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "єКапітал", statusBarStyle: "default" },
  icons: { icon: "/icons/wallet-192.png", apple: "/icons/wallet-180.png" },
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
