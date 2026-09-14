// Local fixture access only. Never deploy this test-identity gateway.
import http from 'node:http'
import {timingSafeEqual} from 'node:crypto'

export function createGateway({password,teacherToken,port=3104,expiresAt=Date.now()+2*60*60*1000}) {
 if(!teacherToken)throw Error('Preview instructor identity required')
 const expected=password?Buffer.from('Basic '+Buffer.from('instructor:'+password).toString('base64')):null
 return http.createServer((req,res)=>{
  res.setHeader('Cache-Control','private, no-store')
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive')
  if(Date.now()>expiresAt){res.writeHead(410);return res.end('Test preview expired.')}
  const supplied=Buffer.from(req.headers.authorization||'')
  if(expected&&(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))){
   res.writeHead(401,{'WWW-Authenticate':'Basic realm="Private attendance test", charset="UTF-8"'});return res.end('Private preview. Enter the test credentials supplied by Ceech.')
  }
  const path=(req.url||'/').split('?')[0]
  if(!(/^\/attendance(?:\/|$)/.test(path)||/^\/api\/attendance\//.test(path)||/^\/_next\/static\//.test(path)||path==='/dashboard')){res.writeHead(404);return res.end('Open /attendance/instructor for this test.')}
  if(!['GET','HEAD','POST'].includes(req.method)){res.writeHead(405);return res.end()}
  const protocol=req.headers['x-forwarded-proto']==='https'?'https':'http'
  if(req.method==='POST'&&req.headers.origin!==`${protocol}://${req.headers.host}`){res.writeHead(403);return res.end('Cross-origin request blocked.')}
  const instructorPath=/^\/attendance\/instructor(?:\/|$)/.test(path)
  // This is a local-only convenience: instructor API requests always use the
  // fixture teacher. Student check-in/history/email routes never receive it.
  const instructorApi=/^\/api\/attendance\/(?:classes|meetings|enrollments|corrections|sync|push)(?:\/|$)/.test(path)
  const teacher=instructorPath||instructorApi||/(?:^|;\s*)attendance-preview-role=teacher(?:;|$)/.test(req.headers.cookie||'')
  const original=req.headers.cookie||''
  const headers={...req.headers,host:`localhost:${port}`,cookie:teacher?`${original}${original?'; ':''}authjs.session-token=${teacherToken}`:original,'x-forwarded-host':`localhost:${port}`,'x-forwarded-proto':'http'}
  delete headers.authorization
  if(req.headers.origin)headers.origin=`http://localhost:${port}`
  const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers},response=>{
   const output={...response.headers,'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow, noarchive'}
   const existing=output['set-cookie']
   if(instructorPath)output['set-cookie']=[...(Array.isArray(existing)?existing:existing?[existing]:[]),'attendance-preview-role=teacher; Path=/; Max-Age=7200; HttpOnly; Secure; SameSite=Lax']
   if(output.location?.startsWith(`http://localhost:${port}/`))output.location=output.location.slice(`http://localhost:${port}`.length)
   res.writeHead(response.statusCode,output);response.pipe(res)
  })
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Local preview unavailable.')})
  req.pipe(upstream)
 })
}
