import type { Metadata } from "next";
import { ProfileProvider } from "@/components/profile-context";
import { AppShell } from "@/components/app-shell";
import { getSnapshot } from "@/lib/data/market";
export const metadata: Metadata = {
  title: "Що можуть дати ваші гроші",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider initialMarket={getSnapshot()}>
      <AppShell>{children}</AppShell>
    </ProfileProvider>
  );
}
