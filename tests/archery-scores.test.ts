import test from 'node:test'
import assert from 'node:assert/strict'
import {scorePoints,scoreRing,parseArrowScores,scoreForRotation,rotationForScore,angleDelta} from '../src/lib/archery/scores'

test('target marks retain X and miss while totals and target colors are correct',()=>{
 assert.equal(scorePoints('X'),10);assert.equal(scorePoints('M'),0)
 for(const [mark,ring] of [['M','miss'],['1','white'],['2','white'],['3','black'],['4','black'],['5','blue'],['6','blue'],['7','red'],['8','red'],['9','yellow'],['10','yellow'],['X','yellow']] as const)assert.equal(scoreRing(mark),ring)
 assert.deepEqual(parseArrowScores(undefined,['X','10','9','M','1']),{scores:[10,10,9,0,1],marks:['X','10','9','M','1']})
 assert.deepEqual(parseArrowScores([0,1,10]),{scores:[0,1,10],marks:['M','1','10']})
 for(const [scores,marks] of [[[9],['X']],[[0],['0']],[[10],['x']],[[10],['X','10']],[[null],undefined],[[],undefined],[[1.5],undefined],[undefined,['M',null]],[undefined,Array(101).fill('X')]] as const)assert.throws(()=>parseArrowScores(scores,marks))
})

test('rotary scores snap through full turns with X at the top and wrap smoothly',()=>{
 assert.equal(scoreForRotation(0),'X');assert.equal(scoreForRotation(-30),'10');assert.equal(scoreForRotation(30),'M')
 assert.equal(scoreForRotation(720),'X');assert.equal(scoreForRotation(-720-60),'9')
 assert.equal(scoreForRotation(-29),'10')
 assert.equal(scoreForRotation(rotationForScore('7',710)),'7')
 assert.ok(Math.abs(rotationForScore('7',710)-710)<=180)
 assert.equal(angleDelta(179,-179),2);assert.equal(angleDelta(-179,179),-2)
})
