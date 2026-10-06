import { getSnapshot } from "@/lib/data/market";
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("asset");
  if (!code || !["usd", "eur", "gold", "silver"].includes(code))
    return Response.json({ error: "Unsupported asset" }, { status: 400 });
  const from = params.get("from"),
    to = params.get("to");
  if ([from, to].some((d) => d !== null && !/^\d{4}-\d{2}-\d{2}$/.test(d)))
    return Response.json({ error: "Invalid date" }, { status: 400 });
  const rows = (getSnapshot({ history: true }).history[code] ?? []).filter(
    (p) => (!from || p.date >= from) && (!to || p.date <= to),
  );
  return Response.json(
    {
      points: rows.map(({ date, value }) => ({ date, value })),
      meta: rows.at(-1)?.meta ?? null,
      status: rows.length ? "available" : "unavailable",
    },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
