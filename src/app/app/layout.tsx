import type { Metadata } from "next";
import { ProfileProvider } from "@/components/profile-context";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = {
  title: "Мій капітал",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <AppShell>{children}</AppShell>
    </ProfileProvider>
  );
}
