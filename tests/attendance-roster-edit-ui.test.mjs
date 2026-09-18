import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('roster replaces email editing with class-scoped nickname editing after first name', async () => {
  const roster = await readFile('src/components/attendance/ClassRosterSummary.tsx', 'utf8')
  const editor = await readFile('src/components/attendance/EditNickname.tsx', 'utf8')
  assert.doesNotMatch(roster, /EditRosterEmail/)
  assert.match(roster, /First name<\/th><th scope="col">Nickname/)
  assert.match(editor, /action: 'nickname', classId, enrollmentId/)
  assert.match(editor, /maxLength=\{80\}/)
  assert.match(editor, /Google name and email stay unchanged/)
})

test('nickname has room for its editor; count columns stay compact', async () => {
  const css = await readFile('src/components/attendance/Attendance.module.css', 'utf8')
  assert.match(css, /\.rosterDetails th:nth-child\(4\), \.rosterDetails td:nth-child\(4\) \{ width: 340px;/)
  assert.match(css, /min-width: 1156px/)
  assert.match(css, /\.rosterDetails td:nth-child\(4\) \.rosterEditForm \{ min-width: 0;/)
})

test('compact removal uses an accessible icon, separate Actions column, and confirmation dialog', async () => {
  const roster = await readFile('src/components/attendance/ClassRosterSummary.tsx', 'utf8')
  const control = await readFile('src/components/attendance/RemoveStudent.tsx', 'utf8')
  assert.match(roster, />Actions<\/th>/)
  assert.match(control, /<dialog/)
  assert.match(control, /aria-label=.*Remove from this class/)
  assert.match(control, /confirmation !== 'delete'/)
})
