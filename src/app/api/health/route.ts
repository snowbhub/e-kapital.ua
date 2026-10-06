export function GET() {
  return Response.json({
    status: "ok",
    service: "e-kapital",
    version: "0.1.0",
  });
}
