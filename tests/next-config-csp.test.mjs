import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configPath = new URL("../next.config.ts", import.meta.url);

test("permits React development diagnostics without weakening the production CSP", async () => {
  const config = await readFile(configPath, "utf8");

  assert.match(config, /const DEVELOPMENT_CONTENT_SECURITY_POLICY/);
  assert.match(config, /"script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"/);
  assert.match(config, /process\.env\.NODE_ENV === "development"[\s\S]*DEVELOPMENT_CONTENT_SECURITY_POLICY[\s\S]*DEFAULT_CONTENT_SECURITY_POLICY/);
});

test("keeps the local enrollment preview free of Next.js developer controls", async () => {
  const config = await readFile(configPath, "utf8");

  assert.match(config, /devIndicators:\s*false/);
});

test("allows the homepage HTML to be served from an edge cache", async () => {
  const config = await readFile(configPath, "utf8");

  assert.match(config, /const homepageCacheHeaders[\s\S]*?public, s-maxage=86400, stale-while-revalidate=604800/,
    "the homepage should advertise a shared cache lifetime");
  assert.match(config, /source:\s*"\/"[\s\S]*?headers: homepageCacheHeaders/,
    "the homepage should use the shared cache headers");
});
