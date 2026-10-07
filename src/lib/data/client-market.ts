import { marketSchema, type Market } from "./schema";

// An installed PWA can receive the previous release's HTTP/SW-cached payload.
// Validate that boundary and retain seeded bank data when old fields are absent.
export function acceptMarketResponse(
  previous: Market,
  incoming: unknown,
): Market {
  const parsed = marketSchema.safeParse(incoming);
  if (!parsed.success || typeof incoming !== "object" || incoming === null)
    return previous;
  const hasDeposits = "deposits" in incoming,
    hasFx = "fxQuotes" in incoming;
  return {
    ...parsed.data,
    history: Object.keys(parsed.data.history).length
      ? parsed.data.history
      : previous.history,
    deposits: hasDeposits ? parsed.data.deposits : previous.deposits,
    fxQuotes: hasFx ? parsed.data.fxQuotes : previous.fxQuotes,
    health: [
      ...parsed.data.health,
      ...previous.health.filter(
        (h) =>
          ((!hasDeposits && h.id.startsWith("bank-") && h.id !== "bank-fx") ||
            (!hasFx && h.id === "bank-fx")) &&
          !parsed.data.health.some((x) => x.id === h.id),
      ),
    ],
  };
}
