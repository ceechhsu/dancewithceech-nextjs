import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseRosterRows} from '../src/lib/attendance/roster-import'
test('preserves explicit name fields without guessing from a display name',()=>{
 const split=parseRosterRows([['First Name','Last Name','Email'],['Jane Mary','De la Cruz','j@example.com']]).rows[0]
 assert.equal(split.first_name,'Jane Mary');assert.equal(split.last_name,'De la Cruz')
 const full=parseRosterRows([['Name','Email'],['Jane Mary De la Cruz','j@example.com']]).rows[0]
 assert.equal(full.first_name,null);assert.equal(full.last_name,null)
})
test('accepts nullable email and preserves leading zero IDs',()=>{
 const result=parseRosterRows([['Student ID','First Name','Last Name','Email'],['00123','Jane','Example',''],['00124','Sam','Example',' SAM@EXAMPLE.COM ']])
 assert.equal(result.errors.length,0);assert.equal(result.rows[0].college_id,'00123');assert.equal(result.rows[0].email,null);assert.equal(result.rows[1].email,'sam@example.com')
})
test('flags invalid rows and duplicates instead of silently skipping',()=>{
 const result=parseRosterRows([['Name','College ID','Email'],['Jane','1','bad'],['Jane','1','j@example.com'],['','2','a@example.com']])
 assert.ok(result.errors.length>=3)
})
test('supports name and email only without requiring college IDs',()=>{
 const result=parseRosterRows([['Name','Email'],['Jane','jane@example.com'],['Sam','sam@example.com']]);assert.deepEqual(result.errors,[]);assert.equal(result.rows.length,2)
})
test('finds a header after exported report metadata',()=>{
 assert.equal(parseRosterRows([['Class report'],[],['ID','Student Name'],['001','Example, Jane']]).rows[0].name,'Example, Jane')
})
