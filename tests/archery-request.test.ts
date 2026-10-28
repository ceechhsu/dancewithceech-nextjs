import test from 'node:test'
import assert from 'node:assert/strict'
import { parseArcheryRequest } from '../src/lib/archery/request'
const classId='00000000-0000-0000-0000-000000000001'
const post=(body:unknown,origin='https://example.com')=>new Request('https://example.com/api/attendance/archery',{method:'POST',headers:{origin},body:JSON.stringify(body)})
test('archery HTTP validation rejects malformed requests and trusts no client identity',async()=>{
 assert.equal((await parseArcheryRequest(new Request('https://example.com/api/attendance/archery?classId='+classId))).action,'list')
 const round={action:'round_save',classId,id:classId,date:'2026-10-18',distance:30,unit:'m',scores:[10,9,0],notes:'Good'}
 assert.equal((await parseArcheryRequest(post({...round,p_actor:'fake@example.com',instructor:true}))).body.p_actor,undefined)
 assert.deepEqual((await parseArcheryRequest(post({...round,scores:[10,10,0],marks:['X','10','M']}))).body.marks,['X','10','M'])
 await assert.rejects(parseArcheryRequest(post({...round,marks:['X','9','1']})),/score|mark/i)
 for(const change of [{scores:[]},{scores:[null]},{scores:[-1]},{scores:[10.5]},{distance:0},{unit:'km'},{id:'bad'},{notes:'x'.repeat(2001)}])await assert.rejects(parseArcheryRequest(post({...round,...change})))
 await assert.rejects(parseArcheryRequest(post(round,'https://evil.example')),/origin/)
 await assert.rejects(parseArcheryRequest(post({action:'tournament_create',classId,id:classId,title:'A',game:'B',participants:[classId,classId]})),/Unknown/)
 await assert.rejects(parseArcheryRequest(post({action:'challenge_respond',classId,id:classId,accept:'yes'})))
 const hosted=await parseArcheryRequest(post({action:'tournament_open',classId,id:classId,title:'Friday',game:'Tic tac toe',instructions:'Best of three',date:'2026-10-18'}))
 assert.equal(hosted.body.instructions,'Best of three')
 await assert.rejects(parseArcheryRequest(post({action:'tournament_open',classId,id:classId,title:'Friday',game:'Game',date:'2026-10-18',participants:[classId]})),/opt in/)
 assert.equal((await parseArcheryRequest(post({action:'tournament_join',classId,id:classId,enrollmentId:'spoof'}))).body.enrollmentId,undefined)
 assert.equal((await parseArcheryRequest(post({action:'match_confirm',classId,id:classId,accept:true}))).action,'match_confirm')
})

test('tournament setup validates format and optional signup timer',async()=>{
 const setup={action:'tournament_open',classId,id:classId,title:'Friday',game:'Game',date:'2026-10-27'}
 assert.deepEqual((await parseArcheryRequest(post({...setup,format:'double',signupMinutes:null}))).body,{classId,id:classId,title:'Friday',game:'Game',instructions:'',date:'2026-10-27',format:'double',signupMinutes:null})
 assert.equal((await parseArcheryRequest(post({...setup,format:'single',signupMinutes:10}))).body.signupMinutes,10)
 for(const change of [{format:'bad'},{format:null},{signupMinutes:0},{signupMinutes:121},{signupMinutes:2.5},{signupMinutes:'5'}])await assert.rejects(parseArcheryRequest(post({...setup,...change})))
})

test('instructor dispute resolution whitelists only valid result IDs, winner and notes',async()=>{
 const input={action:'dispute_resolve',classId,id:classId,winnerId:classId,notes:'Reviewed',resolved_by:'forged',instructor:true}
 assert.deepEqual(await parseArcheryRequest(post(input)),{action:'dispute_resolve',body:{classId,id:classId,winnerId:classId,notes:'Reviewed'}})
 for(const change of [{id:'bad'},{winnerId:'bad'},{winnerId:null},{notes:'x'.repeat(2001)}])await assert.rejects(parseArcheryRequest(post({...input,...change})))
})
