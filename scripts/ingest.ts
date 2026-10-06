import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  parseStoredMarket,
  storeMarket,
  emptyMarket,
} from "../src/lib/data/schema";
import { syncMarket } from "../src/lib/data/sync";
import { applyBankSeed } from "../src/lib/data/market";
let previous = emptyMarket;
try {
  previous = parseStoredMarket(
    JSON.parse(await readFile("data/market.json", "utf8")),
  );
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const next = await syncMarket(applyBankSeed(previous));
await mkdir("data", { recursive: true });
await writeFile(
  "data/market.json",
  JSON.stringify(storeMarket(next), null, 2) + "\n",
);
for (const source of next.health)
  console.log(
    `${source.id}: ${source.error ? "ERROR " + source.error : "OK " + source.records + " records"}; last success ${source.lastSuccess ?? "never"}`,
  );
if (
  process.env.FAIL_ON_DATA_ERROR === "true" &&
  next.health.some((h) => h.error)
)
  process.exitCode = 1;
