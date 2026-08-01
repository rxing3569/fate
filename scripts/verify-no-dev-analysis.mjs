import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const outputRoot = resolve(".output");
const searchableExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".txt",
]);
const forbidden = [
  "FATE_DEV_ANALYSIS_PANEL",
  "fate-dev-analysis-applied",
  "dev-control-panel",
  "DEV 模擬資料",
  "DevFloatingButton.client.vue",
];

async function filesUnder(directory) {
  const entries = await readdir(directory);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry);
      return (await stat(path)).isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return nested.flat();
}

const leaks = [];
for (const path of await filesUnder(outputRoot)) {
  if (!searchableExtensions.has(extname(path))) continue;
  const source = await readFile(path, "utf8");
  for (const marker of forbidden) {
    if (source.includes(marker)) {
      leaks.push(`${relative(outputRoot, path)} contains ${JSON.stringify(marker)}`);
    }
  }
}

if (leaks.length) {
  console.error("Production output contains dev analysis code:");
  for (const leak of leaks) console.error(`- ${leak}`);
  process.exit(1);
}

console.log("Verified: production output contains no dev analysis panel code.");
