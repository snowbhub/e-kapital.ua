import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
await cp("public", ".next/standalone/public", { recursive: true });
// This project uses only App Router. An empty Pages manifest must be valid JSON.
const pagesManifest = ".next/server/pages-manifest.json";
if (!(await readFile(pagesManifest, "utf8")).trim())
  await writeFile(pagesManifest, "{}");
await cp(pagesManifest, ".next/standalone/.next/server/pages-manifest.json");
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const worker = await readFile("public/sw.js", "utf8");
await writeFile(
  ".next/standalone/public/sw.js",
  worker.replace("ek-shell-v2", `ek-shell-${buildId}`),
);
