import { backendConfigured, database } from "@/lib/server/database";
export async function GET() {
  let backend = "disabled";
  let status = "ok";
  if (backendConfigured()) {
    try {
      await (await database()).query("SELECT 1");
      backend = "ready";
    } catch {
      backend = "unavailable";
      status = "degraded";
    }
  }
  return Response.json(
    {
      status,
      backend,
      service: "e-kapital",
      version: "0.1.0",
      commit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
