import redirects from "../src/content/redirects.json" with { type: "json" };

const sources = new Set(redirects.map((redirect) => redirect.source));
const missingNormalizedSources = redirects
  .map((redirect) => redirect.source)
  .filter((source) => source !== "/" && source.endsWith("/"))
  .map((source) => source.slice(0, -1))
  .filter((source) => !sources.has(source));

if (missingNormalizedSources.length > 0) {
  console.error("Missing redirects for normalized trailing-slash URLs:");
  for (const source of missingNormalizedSources) {
    console.error(`- ${source}`);
  }
  process.exit(1);
}

console.log(`Checked ${redirects.length} redirects.`);
