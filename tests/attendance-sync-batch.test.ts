import {test} from 'node:test'
import assert from 'node:assert/strict'
import {syncBatches} from '../src/lib/attendance/offline'
test('splits large queues without dropping or duplicating operations',()=>{const input=Array.from({length:451},(_,i)=>i);const batches=syncBatches(input);assert.deepEqual(batches.map(b=>b.length),[200,200,51]);assert.deepEqual(batches.flat(),input)})
