const baseUrl = process.argv[2] ?? "https://dancewithceech.com";
const sitemapUrl = `${baseUrl.replace(/\/$/, "")}/sitemap.xml`;

const sitemapResponse = await fetch(sitemapUrl);
if (!sitemapResponse.ok) {
  console.error(`Failed to fetch sitemap: ${sitemapResponse.status} ${sitemapResponse.statusText}`);
  process.exit(1);
}

const sitemapXml = await sitemapResponse.text();
const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const failures = [];
let index = 0;

async function checkNext() {
  while (index < urls.length) {
    const url = urls[index++];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        failures.push(`${url} returned ${response.status}`);
        continue;
      }

      const html = await response.text();
      const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
      if (canonical !== url) {
        failures.push(`${url} canonical is ${canonical ?? "missing"}`);
      }
    } catch (error) {
      failures.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

await Promise.all(Array.from({ length: 8 }, checkNext));

if (failures.length > 0) {
  console.error("Sitemap canonical failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Checked canonicals for ${urls.length} sitemap URLs.`);
