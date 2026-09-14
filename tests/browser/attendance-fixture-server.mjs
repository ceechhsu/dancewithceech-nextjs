// Disposable local PostgreSQL-compatible fixture. Never uses a real Supabase project.
import http from 'node:http'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite()
await db.exec('create role anon; create role authenticated; create role service_role;')
const migrations=['20260912163507_attendance_private.sql','20260912210000_attendance_email_code_auth.sql']
await db.exec((await Promise.all(migrations.map(name=>readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8')))).join('\n'))
await db.exec(`insert into attendance_classes(id,instructor_email,name,college,term,year,start_date,end_date,timezone,days,start_time,end_time) values ('00000000-0000-0000-0000-000000000001','teacher@example.com','Hip Hop — Test Class','Mission College','Fall',2026,current_date-1,current_date+120,'America/Los_Angeles','{1,3,5}','09:30','11:00');
insert into attendance_enrollments(id,class_id,name,email,effective_from) values
 ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Alex Sample','ceechmission+alex@gmail.com',current_date-1),
 ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Betty Sample','ceechmission+betty@gmail.com',current_date-1),
 ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','Cathy Sample','ceechmission+cathy@gmail.com',current_date-1);`)
http.createServer(async(req,res)=>{
 if(req.method!=='POST'||!req.url?.startsWith('/rest/v1/rpc/')){res.writeHead(404);return res.end()}
 try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>500000)throw Error('Too large')};const b=JSON.parse(raw);const fn=req.url.split('/').pop();const query=fn==='attendance_api'?'select attendance_api($1,$2,$3,$4,$5,$6) as data':'select attendance_email_code($1,$2,$3) as data';const values=fn==='attendance_api'?[b.p_actor,b.p_sub,b.p_instructor,b.p_resource,b.p_action,JSON.stringify(b.p_body)]:[b.p_action,b.p_email,b.p_code_hash];const result=await db.query(query,values);res.setHeader('content-type','application/json');res.end(JSON.stringify(result.rows[0].data))}catch(error){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({code:'P0001',message:error.message}))}
}).listen(Number(process.env.FIXTURE_PORT||55433),'127.0.0.1',()=>console.log('Disposable attendance fixture ready'))
