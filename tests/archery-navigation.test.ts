import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('direct archery page verifies actual class membership before rendering the hub', async () => {
  const source = await readFile('src/app/attendance/archery/[classId]/page.tsx', 'utf8')
  assert.match(source, /await getArcheryClasses\(/)
  assert.match(source, /classes\.some\(/)
  assert.ok(source.indexOf('classes.some(') < source.indexOf('<ArcheryHub'))
})

import { archeryClasses, createArcheryNavigation } from '../src/lib/attendance/archery-navigation'
const id = '00000000-0000-0000-0000-000000000001'
const another = '00000000-0000-0000-0000-000000000002'
const student = { email: 'student@example.com', googleSub: 'student-sub', googleEmailVerified: true }
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }

test('menu projection uses the configured tool and exposes only IDs and names', () => {
  assert.deepEqual(archeryClasses({classes:[{id,name:'Section A',progress_tool:'archery',roster:['private'],instructor_email:'teacher@example.com'},{id:another,name:'Archery dance',progress_tool:'none'},{id:'bad',name:'Bad',progress_tool:'archery'}]}), [{id,name:'Section A'}])
  for (const data of [null, {}, {classes:null}, {classes:[{id,name:'Archery',progress_tool:'weight_training'}]}]) assert.deepEqual(archeryClasses(data), [])
})

test('navigation stays closed for anonymous and unverified accounts and API failures', async () => {
  for (const identity of [null, {...student,googleEmailVerified:false}, {...student,googleSub:undefined}]) {
    const published: (string|null)[] = []; let calls = 0
    const controller=createArcheryNavigation({session:async()=>identity,load:async()=>{calls++;return {account:student.email,classes:[{id,name:'Archery'}]}},publish:href=>published.push(href)})
    await controller.refresh(); assert.equal(calls,0); assert.equal(published.at(-1),null)
  }
  const published:(string|null)[]=[]
  const controller=createArcheryNavigation({session:async()=>student,load:async()=>{throw Error('offline')},publish:href=>published.push(href)})
  await controller.refresh(); assert.equal(published.at(-1),null)
})

test('navigation links one eligible class directly and multiple classes through the protected landing', async () => {
  for (const [classes,expected] of [[[],null],[[{id,name:'Archery'}],'/attendance/archery/'+id],[[{id,name:'Archery'},{id:another,name:'Second section'}],'/attendance/archery']] as const) {
    const published:(string|null)[]=[]
    const controller=createArcheryNavigation({session:async()=>student,load:async()=>({account:student.email,classes}),publish:href=>published.push(href)})
    await controller.refresh(); assert.equal(published.at(-1),expected)
  }
})

test('logout invalidates an in-flight membership response even when transport ignores abort', async () => {
  const result=deferred<unknown>(); const published:(string|null)[]=[]
  const controller=createArcheryNavigation({session:async()=>student,load:()=>result.promise,publish:href=>published.push(href)})
  const pending=controller.refresh(); await Promise.resolve(); controller.invalidate()
  result.resolve({account:student.email,classes:[{id,name:'Archery'}]}); await pending
  assert.equal(published.at(-1),null); assert.equal(published.filter(Boolean).length,0)
})

test('account switches during access lookup or mismatched server account cannot reveal the old link', async () => {
  let current: typeof student|null=student
  const result=deferred<unknown>(); const published:(string|null)[]=[]
  const controller=createArcheryNavigation({session:async()=>current,load:()=>result.promise,publish:href=>published.push(href)})
  const pending=controller.refresh(); await Promise.resolve(); current={...student,email:'outsider@example.com'}
  result.resolve({account:student.email,classes:[{id,name:'Archery'}]}); await pending
  assert.equal(published.at(-1),null)
  await controller.refresh(); assert.equal(published.at(-1),null)
})

test('a stale lookup cannot replace a newer denial and disposal cannot publish', async () => {
  const old=deferred<unknown>(); let count=0; const published:(string|null)[]=[]
  const controller=createArcheryNavigation({session:async()=>student,load:async()=>++count===1?old.promise:{account:student.email,classes:[]},publish:href=>published.push(href)})
  const pending=controller.refresh(); await Promise.resolve(); await controller.refresh()
  old.resolve({account:student.email,classes:[{id,name:'Archery'}]}); await pending
  assert.equal(published.at(-1),null)
  controller.dispose(); const before=published.length; await controller.refresh(); assert.equal(published.length,before)
})
