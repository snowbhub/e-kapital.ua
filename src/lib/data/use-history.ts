"use client";
import { useEffect, useState } from "react";
import type { HistoryPoint } from "@/lib/finance/portfolio";

export function useHistory(
  assets: string,
  from: string,
  to: string,
  enabled = true,
) {
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({});
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const ids = assets
      .split(",")
      .filter((id) => ["usd", "eur", "gold", "silver"].includes(id));
    setLoading(true);
    setHistory({});
    Promise.all(
      ids.map(async (asset) => {
        try {
          const query = new URLSearchParams({ asset, from, to });
          const r = await fetch(`/api/history?${query}`, {
            signal: controller.signal,
          });
          if (!r.ok) throw new Error();
          const json = (await r.json()) as { points: HistoryPoint[] };
          return [asset, json.points] as const;
        } catch {
          return [asset, []] as const;
        }
      }),
    ).then((rows) => {
      if (!controller.signal.aborted) {
        setHistory(Object.fromEntries(rows));
        setLoading(false);
      }
    });
    return () => controller.abort();
  }, [assets, from, to, enabled]);
  return { history, loading };
}
