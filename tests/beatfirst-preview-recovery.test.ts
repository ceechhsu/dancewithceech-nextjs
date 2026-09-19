import assert from 'node:assert/strict'
import test from 'node:test'
import { createProgressStorage } from '../src/components/beatfirst-preview/progress-storage'
import { progressRequest } from '../src/components/beatfirst-preview/progress-request'
import { claimGuest, emptyLocal, parseLocal, type LocalProgress } from '../src/components/beatfirst-preview/local-progress'
import type { Attempt } from '../src/components/beatfirst-preview/progress'
const attempt = (i: number): Attempt => ({ id:`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`,levelId:1,taps:[],completedAt:new Date().toISOString() })
function memoryStorage() {
  let value: string | null = null
  let fail = false
  return { getItem: () => value, setItem: (_key: string, next: string) => { if (fail) throw new Error('Quota'); value = next }, fail: (next: boolean) => { fail = next }, read: () => parseLocal(value) }
}
test('concurrent tabs apply additions to the latest durable queue', async () => {
  const storage = memoryStorage()
  let pending = Promise.resolve(true)
  const lock = (operation: () => boolean) => { pending = pending.then(operation); return pending }
  const first = createProgressStorage(storage,()=>{},()=>{},lock)
  const second = createProgressStorage(storage,()=>{},()=>{},lock)
  await Promise.all([first.record(attempt(1),'google:alice'), second.record(attempt(2),'google:alice')])
  assert.equal(storage.read().pending['google:alice'].length,2)
})
test('storage refresh preserves unsaved additions after another tab writes', async () => {
  const storage = memoryStorage()
  let shown = emptyLocal()
  const first = createProgressStorage(storage,state=>{shown=state},()=>{})
  storage.fail(true)
  assert.equal(await first.record(attempt(1),'google:alice'),false)
  storage.fail(false)
  const second = createProgressStorage(storage,()=>{},()=>{})
  await second.record(attempt(2),'google:alice')
  first.refresh()
  assert.equal(shown.pending['google:alice'].length,2)
  await first.update(state=>state)
  assert.equal(storage.read().pending['google:alice'].length,2)
})
test('guest ownership is not published until its binding is durable', async () => {
  const storage = memoryStorage()
  let shown: LocalProgress = emptyLocal()
  const store = createProgressStorage(storage,state=>{shown=state},()=>{})
  await store.record(attempt(1),null)
  await store.update(state=>({...state,claim:true}),true)
  storage.fail(true)
  assert.equal(await store.update(state=>claimGuest(state,'google:alice'),true),false)
  assert.equal(shown.claim,true)
  assert.equal(shown.guest.length,1)
  assert.equal(shown.pending['google:alice'],undefined)
  storage.fail(false)
  assert.equal(await store.update(state=>claimGuest(state,'google:alice'),true),true)
  assert.equal(storage.read().guest.length,0)
  assert.equal(storage.read().pending['google:alice'].length,1)
})
test('a progress request times out even after headers arrive if its JSON body stalls', async () => {
  let aborted = false
  const fetcher: typeof fetch = async (_url,options) => new Response(new ReadableStream({ start(controller) { options?.signal?.addEventListener('abort',()=>{aborted=true;controller.error(new Error('Aborted'))}) } }))
  await assert.rejects(progressRequest({},fetcher,20),/waiting on this device/)
  assert.equal(aborted,true)
})
test('retries while storage is blocked never duplicate a guest round in memory', async () => {
  let shown = emptyLocal()
  const storage = { getItem: () => { throw new Error('Blocked') }, setItem: () => { throw new Error('Blocked') } }
  const store = createProgressStorage(storage,state=>{shown=state},()=>{})
  await store.record(attempt(1),null)
  await store.update(state=>state)
  assert.equal(shown.guest.length,1)
})
