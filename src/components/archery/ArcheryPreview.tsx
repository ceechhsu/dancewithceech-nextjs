'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {PGlite} from '@electric-sql/pglite'
import type {ArcheryTransport} from '@/lib/archery/types'
import ArcheryHub from './ArcheryHub'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'
const classId='00000000-0000-0000-0000-000000000001'
const people=['Alex Sample','Jordan Example','Casey Demo','Morgan Sample','Riley Demo','Sam Example','Taylor Sample','Jamie Demo','Drew Example','Quinn Sample','Robin Demo','Avery Example']
export default function ArcheryPreview({schema,rules,upgrade,scoreRules,instructorRules,tournamentRules,disputeRules,historyRules,challengeRules}:{schema:string;rules:string;upgrade:string;scoreRules:string;instructorRules:string;tournamentRules:string;disputeRules:string;historyRules:string;challengeRules:string}){
 const db=useRef<PGlite|null>(null),boot=useRef<Promise<void>|null>(null)
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[view,setView]=useState('1'),[revision,setRevision]=useState(0),[resetting,setResetting]=useState(false),[startPractice,setStartPractice]=useState(false)
 const seed=useCallback(async(database:PGlite)=>{
  await database.transaction(async tx=>{await tx.exec(schema+'\n'+rules+'\n'+upgrade+'\n'+scoreRules+'\n'+instructorRules+'\n'+tournamentRules+'\n'+disputeRules+'\n'+historyRules+'\n'+challengeRules)})
 },[schema,rules,upgrade,scoreRules,instructorRules,tournamentRules,disputeRules,historyRules,challengeRules])
 useEffect(()=>{
  let cancelled=false
  if(!boot.current)boot.current=(async()=>{
   const [{PGlite},wasm,data]=await Promise.all([import('@electric-sql/pglite'),fetch('/api/archery-preview/runtime/pglite.wasm').then(r=>{if(!r.ok)throw Error('Preview assets could not load.');return r.arrayBuffer()}),fetch('/api/archery-preview/runtime/pglite.data').then(r=>r.blob())])
   const database=await PGlite.create({dataDir:'idb://dwc-archery-phone-preview-v1',wasmModule:await WebAssembly.compile(wasm),fsBundle:data})
   db.current=database
   const table=await database.query("select to_regclass('public.archery_tournaments') as present")
   if(!table.rows[0]||!(table.rows[0] as {present:unknown}).present)await seed(database)
   else {
    const version=await database.query("select 1 from information_schema.columns where table_schema='public' and table_name='archery_tournaments' and column_name='registration_ends_at'")
    if(!version.rows.length)await database.transaction(async tx=>{await tx.exec(upgrade)})
    const scoreVersion=await database.query("select 1 from information_schema.columns where table_schema='public' and table_name='archery_rounds' and column_name='score_marks'")
    if(!scoreVersion.rows.length)await database.transaction(async tx=>{await tx.exec(scoreRules)})
    const instructorVersion=await database.query("select to_regclass('public.archery_instructor_rounds') as present")
    if(!(instructorVersion.rows[0] as {present:unknown})?.present)await database.transaction(async tx=>{await tx.exec(instructorRules)})
    const tournamentVersion=await database.query("select 1 from information_schema.columns where table_schema='public' and table_name='archery_tournaments' and column_name='engine_version'")
    if(!tournamentVersion.rows.length)await database.transaction(async tx=>{await tx.exec(tournamentRules)})
    const disputeVersion=await database.query("select to_regclass('public.archery_result_disputes') as present")
    if(!(disputeVersion.rows[0] as {present:unknown})?.present)await database.transaction(async tx=>{await tx.exec(disputeRules)})
    const historyVersion=await database.query("select to_regprocedure('archery_private.archery_api_disputes(text,text,boolean,text,jsonb)') as present")
    if(!(historyVersion.rows[0] as {present:unknown})?.present)await database.transaction(async tx=>{await tx.exec(historyRules)})
    const challengeVersion=await database.query("select to_regclass('public.archery_challenge_players') as present")
    if(!(challengeVersion.rows[0] as {present:unknown})?.present)await database.transaction(async tx=>{await tx.exec(challengeRules)})
   }
  })()
  boot.current.then(()=>{if(!cancelled)setReady(true)}).catch(err=>{if(!cancelled)setError(errorMessage(err))})
  return()=>{cancelled=true}
 },[seed,upgrade,scoreRules,instructorRules,tournamentRules,disputeRules,historyRules,challengeRules])
 const transport=useCallback<ArcheryTransport>(async(action,body={})=>{
  if(!db.current)throw Error('The preview is loading.')
  const email=view==='teacher'?'teacher@example.com':`student${view}@example.com`
  const result=await db.current.query<{data:unknown}>('select archery_api($1,$2,$3,$4,$5) data',[email,'demo-'+email,view==='teacher',action,{classId,...body}])
  return result.rows[0].data
 },[view])
 async function reset(){setResetting(true);setReady(false);try{await db.current!.exec('drop schema if exists archery_private cascade; drop schema public cascade; create schema public;');await seed(db.current!);setRevision(v=>v+1);setReady(true)}catch(err){setError(errorMessage(err))}finally{setResetting(false)}}
 return <>
  <section className={a.previewBanner} aria-label="Preview controls">
   <label className={s.field}>Preview as<select aria-label="Preview as" value={view} disabled={!ready} onChange={e=>{setStartPractice(false);setView(e.target.value)}}><option value="teacher">Instructor</option>{people.map((name,i)=><option key={name} value={String(i+1)}>{name}</option>)}</select></label>
   <details><summary>Preview options</summary><p>These controls are only for trying the preview. Use one browser to switch between fictional students and the instructor; this sample does not sync across phones. Your class’s signed-in app uses their own accounts.</p><p>Reset clears only this browser’s sample history.</p><button className={`${s.button} ${s.secondary}`} disabled={!ready||resetting} onClick={()=>void reset()}>Reset preview</button></details>
  </section>
  {error?<p role="alert" className={s.error}>{error} Reload this preview to try again.</p>:ready?<ArcheryHub key={view+'-'+revision} classId={classId} transport={transport} startPractice={startPractice} onTryStudent={view==='teacher'?()=>{setStartPractice(true);setView('1')}:undefined}/>:<p role="status">Preparing your sample class… The first visit downloads the preview’s scoring engine.</p>}
 </>
}
function errorMessage(error:unknown){return error instanceof Error?error.message:'The preview could not load.'}
