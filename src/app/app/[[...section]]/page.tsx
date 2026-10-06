import { notFound } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { Budget } from "@/components/budget";
import { Reserve } from "@/components/reserve";
import { Goals } from "@/components/goals";
import { Portfolio } from "@/components/portfolio";
import { Capital } from "@/components/capital";
import { HistoryView } from "@/components/history";
import { SettingsView } from "@/components/settings";
const pages = {
  budget: Budget,
  reserve: Reserve,
  goals: Goals,
  portfolio: Portfolio,
  capital: Capital,
  history: HistoryView,
  settings: SettingsView,
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  if (!section?.length) return <Dashboard />;
  if (section.length !== 1 || !(section[0] in pages)) notFound();
  const Component = pages[section[0] as keyof typeof pages];
  return <Component />;
}
