import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as details from '../src/lib/private-lesson-details';

test('About uses a ProfilePage with Ceech as its main entity', () => {
  const schema = (details as Record<string, unknown>).aboutProfileSchema as Record<string, unknown> | undefined;
  assert.ok(schema, 'About ProfilePage schema should be defined');
  assert.equal(schema['@type'], 'ProfilePage');
  assert.equal(schema.url, 'https://dancewithceech.com/about');
  assert.deepEqual(schema.mainEntity, details.instructorSchema);
  assert.equal(details.instructorSchema.worksFor['@id'], details.businessSchema['@id']);
  const source = fs.readFileSync(new URL('../src/app/about/page.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('JSON.stringify(aboutProfileSchema)'), 'About must render its ProfilePage schema');
});

test('About introduction explains the local and online teaching connection', () => {
  const source = fs.readFileSync(new URL('../src/app/about/page.tsx', import.meta.url), 'utf8');
  const hero = source.slice(source.indexOf('{/* HERO */}'), source.indexOf('{/* Professional photo */}'));
  assert.match(hero, /hip-hop dance instructor based in San Jose/);
  assert.match(hero, /Bay Area and online/);
  assert.match(hero, /1998/);
  const body = source.slice(0, source.indexOf('{/* FOOTER */}'));
  assert.match(body, /href="\/private-lessons\/san-jose"[^>]*>[\s\S]*?private hip-hop dance lessons in San Jose[\s\S]*?<\/Link>/);
});
