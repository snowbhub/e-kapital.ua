"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ClientAccount } from "./account-client";
const pages: Record<string, string> = {
  "/app": "compare",
  "/app/property": "property",
  "/app/business": "business",
  "/app/plan": "plan",
  "/app/account": "account",
  "/app/markets": "metals",
  "/app/history": "history",
};
export function useTelemetry(user: ClientAccount | null) {
  const path = usePathname();
  useEffect(() => {
    if (!user?.analytics) return;
    type Event = { id: string; name: string; feature: string; device: string };
    let events: Event[] = [],
      sending = false;
    const enqueue = (name: string, feature: string) => {
      if (events.length < 100)
        events.push({
          id: crypto.randomUUID(),
          name,
          feature,
          device: matchMedia("(max-width: 760px)").matches
            ? "mobile"
            : "desktop",
        });
    };
    enqueue("page_view", pages[path] ?? "other");
    const flush = async () => {
      if (sending || !events.length || !navigator.onLine) return;
      const batch = events.slice(0, 20);
      sending = true;
      try {
        const r = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events: batch }),
          keepalive: true,
        });
        if (r.ok) events = events.slice(batch.length);
        else if (r.status === 401) events = [];
      } catch {
        /* Finite memory queue; no financial values or persistent tracking. */
      } finally {
        sending = false;
      }
    };
    const click = (event: MouseEvent) => {
      const target = (event.target as Element)?.closest("button,a");
      if (!target) return;
      // Classify visible controls locally. Only the fixed category is transmitted.
      const text = target.textContent ?? "",
        href = target.getAttribute("href") ?? "";
      const feature =
        target.getAttribute("data-feature") ??
        (/Долар \+|Мікс/.test(text)
          ? "mix"
          : /Inzhur|Фонди/.test(text)
            ? "fund"
            : /ОВДП/.test(text)
              ? "bond"
              : /Депозит|monobank|ПриватБанк/.test(text)
                ? "deposit"
                : /Валюта|долар|євро/.test(text)
                  ? "currency"
                  : /Як було/.test(text)
                    ? "history"
                    : /Зберегти.*(рішення|план)/.test(text)
                      ? "plan"
                      : pages[href]);
      if (feature) enqueue("feature_use", feature);
    };
    const saved = () => enqueue("plan_save", "plan");
    const hidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("click", click);
    window.addEventListener("capital:plan-saved", saved);
    document.addEventListener("visibilitychange", hidden);
    const timer = setInterval(() => void flush(), 10000);
    return () => {
      clearInterval(timer);
      document.removeEventListener("click", click);
      window.removeEventListener("capital:plan-saved", saved);
      document.removeEventListener("visibilitychange", hidden);
      void flush();
    };
  }, [user?.id, user?.analytics, path]);
}
