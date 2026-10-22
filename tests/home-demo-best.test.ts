import test from 'node:test'
import assert from 'node:assert/strict'
import { nextHomeDemoBest } from '../src/components/beatfirst-preview/home-demo-best'
import { getLevel } from '../src/components/beatfirst-preview/levels'
import type { Attempt } from '../src/components/beatfirst-preview/progress'
const attempt=(hits:number,offset=0):Attempt=>({id:'00000000-0000-4000-8000-000000000001',levelId:1,completedAt:'2026-10-22T12:00:00Z',taps:getLevel(1).notes.slice(0,hits).map(note=>({atMs:note.atMs+offset,lane:note.lane}))})
test('first completed sample creates a real best, including an untapped zero round',()=>{
 assert.deepEqual(nextHomeDemoBest(undefined,attempt(0)),{hits:0,score:0})
 assert.deepEqual(nextHomeDemoBest(undefined,attempt(15)),{hits:15,score:100})
})
test('best hit count and timing score remain independent across completed replays',()=>{
 const first=nextHomeDemoBest(undefined,attempt(12))
 assert.deepEqual(first,{hits:12,score:80})
 const moreHits=nextHomeDemoBest(first,attempt(15,170))
 assert.deepEqual(moreHits,{hits:15,score:80})
 assert.deepEqual(nextHomeDemoBest(moreHits,attempt(3)),moreHits)
 assert.deepEqual(nextHomeDemoBest(moreHits,attempt(15)),{hits:15,score:100})
})
test('other levels do not become fifteen-beat sample records',()=>{
 assert.equal(nextHomeDemoBest(undefined,{...attempt(0),levelId:2}),undefined)
})
