// Run with node --test tests/browser/form-recovery.mjs.
// DWC_VERIFY_BASE defaults to localhost; DWC_PLAYWRIGHT_MODULE can point to an installed Playwright runtime.
// All non-GET requests are intercepted: this test never sends email or creates records.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.DWC_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DWC_VERIFY_BASE || 'http://127.0.0.1:3000';
let browser;
before(async () => { browser = await chromium.launch({ headless: true, channel: 'chrome' }); });
after(async () => { await browser?.close(); });

const forms = [
  { name: 'contact', path: '/contact', selector: 'form', endpoint: '/api/contact', values: { name: 'Local test only', email: 'test@example.com', message: 'Intercepted test. Do not send.' }, success: 'Message sent!' },
  { name: 'video evaluation', path: '/private-lessons', selector: '#video-eval form', endpoint: '/api/video-eval', values: { email: 'test@example.com', youtubeUrl: 'https://www.youtube.com/watch?v=test', notes: 'Intercepted test. Do not send.' }, success: 'Video received!' },
];

for (const width of [1440, 390]) {
  for (const config of forms) {
    test(`${config.name} at ${width}px: connection failure, server error, and successful retry`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      try {
        const page = await context.newPage();
        const errors = [];
        const payloads = [];
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', async route => {
          const request = route.request();
          if (['GET', 'HEAD'].includes(request.method())) return route.continue();
          if (new URL(request.url()).pathname !== config.endpoint) return route.abort();
          payloads.push(request.postDataJSON());
          if (payloads.length === 1) return route.abort('failed');
          return route.fulfill({ status: payloads.length === 2 ? 500 : 200, contentType: 'application/json', body: JSON.stringify(payloads.length === 2 ? { error: 'Failed to send' } : { success: true }) });
        });
        assert.equal((await page.goto(base + config.path)).status(), 200);
        const form = page.locator(config.selector);
        for (const [name, value] of Object.entries(config.values)) await form.locator(`[name="${name}"]`).fill(value);
        const button = form.locator('button[type="submit"]');
        for (const failure of ['connection', 'server']) {
          await button.click();
          await page.waitForFunction(selector => {
            const form = document.querySelector(selector);
            return form && !form.querySelector('button[type="submit"]').disabled && form.textContent.includes('Something went wrong');
          }, config.selector, { timeout: 5000 }).catch(() => {});
          assert.equal(await button.isDisabled(), false, `${failure} failure must release the submit button`);
          assert.match(await form.innerText(), /Something went wrong/);
          for (const [name, value] of Object.entries(config.values)) assert.equal(await form.locator(`[name="${name}"]`).inputValue(), value, 'Failure must preserve entered text');
        }
        await button.click();
        await page.getByText(config.success, { exact: false }).waitFor();
        assert.equal(payloads.length, 3, 'One request per user attempt; no automatic duplicate retry');
        assert.deepEqual(payloads[0], payloads[1]);
        assert.deepEqual(payloads[1], payloads[2]);
        assert.deepEqual(errors, [], 'Failures must not produce unhandled exceptions');
        if (config.name === 'contact') {
          assert.equal(await form.locator('[name="message"]').inputValue(), '');
          assert.equal(await button.isDisabled(), false);
        } else {
          assert.equal(await form.count(), 0, 'Successful video evaluation replaces the form with confirmation');
        }
      } finally { await context.close(); }
    });
  }
}
