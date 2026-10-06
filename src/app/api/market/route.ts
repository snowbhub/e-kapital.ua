import { getMarket } from "@/lib/data/market";
export async function GET() {
  return Response.json(await getMarket(), {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
