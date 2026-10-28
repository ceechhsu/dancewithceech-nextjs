import { ProgressRequestError } from '../attendance/progress-request'
import {parseArrowScores} from './scores'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function parseArcheryRequest(request:Request) {
 const url=new URL(request.url)
 if(request.method!=='GET'&&request.method!=='POST')throw new ProgressRequestError('Unsupported method.',405)
 if(request.method==='POST'&&request.headers.get('origin')!==url.origin)throw new ProgressRequestError('Request origin is not allowed.',403)
 let input:Record<string,unknown>
 if(request.method==='GET')input=Object.fromEntries(url.searchParams)
 else {const raw=await request.text();if(raw.length>20000)throw new ProgressRequestError('Request is too large.',413);try{input=JSON.parse(raw)}catch{throw new ProgressRequestError('Invalid request.')}}
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ProgressRequestError('Invalid request.')
 const action=request.method==='GET'?'list':input.action
 if(request.method==='GET'&&input.action&&input.action!=='list')throw new ProgressRequestError('Unknown archery action.')
 if(typeof action!=='string'||!['list','round_save','challenge_create','challenge_respond','challenge_result','challenge_confirm','challenge_cancel','tournament_open','tournament_join','tournament_leave','tournament_close','tournament_cancel','match_result','match_confirm','dispute_resolve'].includes(action)||(request.method==='POST'&&action==='list'))throw new ProgressRequestError('Unknown archery action.')
 const body:Record<string,unknown>={}
 const id=(key:string)=>{if(typeof input[key]!=='string'||!UUID.test(input[key] as string))throw new ProgressRequestError('Choose a valid '+key+'.');body[key]=input[key]}
 const text=(key:string,max:number,optional=false)=>{const value=input[key]??(optional?'':null);if(typeof value!=='string'||value.trim().length>max||(!optional&&!value.trim()))throw new ProgressRequestError('Enter valid '+key+'.');body[key]=value.trim()}
 id('classId');if(action!=='list')id('id')
 if(action==='list'&&input.date!==undefined){if(typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw new ProgressRequestError('Choose a date.');body.date=input.date}
 if(action==='round_save'){
  if(typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw new ProgressRequestError('Choose a date.')
  if(typeof input.distance!=='number'||!Number.isFinite(input.distance)||input.distance<=0||input.distance>1000||!['m','yd'].includes(String(input.unit)))throw new ProgressRequestError('Enter a distance between 0 and 1000 meters or yards.')
  try{Object.assign(body,parseArrowScores(input.scores,input.marks))}catch(error){throw new ProgressRequestError(error instanceof Error?error.message:'Enter valid arrow scores.')}
  Object.assign(body,{date:input.date,distance:input.distance,unit:input.unit});text('notes',2000,true)
 }
 if(action==='challenge_create'){id('opponentId');text('game',160)}
 if(action==='challenge_respond'||action==='challenge_confirm'||action==='match_confirm'){if(typeof input.accept!=='boolean')throw new ProgressRequestError('Choose accept or decline.');body.accept=input.accept}
 if(action==='challenge_result'||action==='match_result'||action==='dispute_resolve'){id('winnerId');text('notes',2000,true)}
 if(action==='tournament_open'){
  if('participants' in input)throw new ProgressRequestError('Students must opt in themselves.')
  text('title',120);text('game',160);text('instructions',1000,true)
  if(typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw new ProgressRequestError('Choose a date.')
  body.date=input.date
  const format=input.format===undefined?'single':input.format
  if(format!=='single'&&format!=='double')throw new ProgressRequestError('Choose a tournament format.')
  const minutes=input.signupMinutes===undefined?5:input.signupMinutes
  if(minutes!==null&&(typeof minutes!=='number'||!Number.isInteger(minutes)||minutes<1||minutes>120))throw new ProgressRequestError('Set a signup timer from 1 to 120 minutes, or close manually.')
  Object.assign(body,{format,signupMinutes:minutes})
 }
 return {action,body}
}
