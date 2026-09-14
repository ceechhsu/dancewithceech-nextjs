import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('My Classes follows booking in the signed-in hamburger menu, not the profile submenu', () => {
  const mobile = readFileSync('src/components/MobileMenu.tsx', 'utf8');
  const profile = readFileSync('src/components/UserMenu.tsx', 'utf8');
  assert.match(mobile, /user && !showAttendance && <a href="\/dashboard"[^>]*>My Classes<\/a>/);
  assert.ok(mobile.indexOf('>My Classes</a>') > mobile.indexOf('>Book a Free Call</Link>'));
  assert.doesNotMatch(profile, /My Dashboard/);
});
test('shared menu retains touch spacing and white booking text inside attendance pages', () => {
  const mobile = readFileSync('src/components/MobileMenu.tsx', 'utf8');
  const css = readFileSync('src/components/Navigation.module.css', 'utf8');
  assert.match(mobile, /className=\{`\$\{styles.navigation\} fixed/);
  assert.match(css, /\.navigation \.booking \{[^}]*color: white/);
});
test('shared menu stays usable on desktop attendance pages and anchors to their header', () => {
  const mobile = readFileSync('src/components/MobileMenu.tsx', 'utf8');
  assert.match(mobile, /alwaysVisible = false/);
  assert.match(mobile, /closest\("nav, header"\)/);
  assert.match(mobile, /!alwaysVisible && window.matchMedia/);
  assert.match(mobile, /className=\{alwaysVisible \? undefined : "xl:hidden"\}/);
});
