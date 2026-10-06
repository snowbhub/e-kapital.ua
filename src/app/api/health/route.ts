export function GET() {
  return Response.json({
    status: "ok",
    service: "e-kapital",
    version: "0.1.0",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
  });
}
