import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('student check-in uses shared header with identity and My Classes', () => {
  const header = readFileSync('src/components/attendance/InstructorHeader.tsx','utf8');
  const frame = readFileSync('src/components/attendance/Frame.tsx','utf8');
  assert.match(header, /Welcome/);
  assert.match(header, /StudentAvatar/);
  assert.match(header, /MobileMenu/);
  assert.match(frame, /student=\{!instructor\}/);
});
test('confirmation displays verified email and retains time and history link', () => {
  const page = readFileSync('src/app/attendance/checkin/[token]/page.tsx','utf8');
  const check = readFileSync('src/components/attendance/CheckIn.tsx','utf8');
  assert.match(page, /email=/);
  assert.match(check, /\{email\}: Present/);
  assert.match(check, /success.record.checked_in_at/);
  assert.match(check, /View my attendance/);
});
