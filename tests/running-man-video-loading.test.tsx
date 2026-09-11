import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import TrackedRunningManVideo from '../src/components/running-man/TrackedRunningManVideo';

test('click-to-play renders a poster button without a downloadable video', () => {
  const html = renderToStaticMarkup(
    <TrackedRunningManVideo placement="homepage_campaign_banner" loadOnPlay poster="/poster.webp" controls>
      <source src="/promo.mp4" type="video/mp4" />
    </TrackedRunningManVideo>,
  );
  assert.match(html, /<button/);
  assert.match(html, /Play Running Man preview/);
  assert.match(html, /poster.webp/);
  assert.doesNotMatch(html, /<video|<source|promo.mp4/);
});

test('existing players retain native video behavior', () => {
  const html = renderToStaticMarkup(
    <TrackedRunningManVideo placement="method_page_hero" controls src="/promo.mp4" />,
  );
  assert.match(html, /<video/);
  assert.match(html, /promo.mp4/);
});
