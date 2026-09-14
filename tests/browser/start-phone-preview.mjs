// Disposable, password-protected instructor preview. No production credentials.
import {spawn} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {encode} from 'next-auth/jwt'
import {createGateway} from './phone-preview-gateway.mjs'
const secret=randomBytes(32).toString('hex')
const teacherToken=await encode({secret,salt:'authjs.session-token',maxAge:7200,token:{email:'teacher@example.com',name:'Test Instructor',googleSub:'test-teacher@example.com',googleEmailVerified:true}})
const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',FIXTURE_PORT:'55434',SUPABASE_URL:'http://127.0.0.1:55434',SUPABASE_SERVICE_ROLE_KEY:'local-fixture',AUTH_SECRET:secret,AUTH_TRUST_HOST:'true',ATTENDANCE_ENABLED:'true',ATTENDANCE_INSTRUCTOR_EMAILS:'teacher@example.com',ATTENDANCE_TEST_MAILBOX:'true',ATTENDANCE_DEVICE_SECRET:randomBytes(32).toString('hex'),ATTENDANCE_CODE_SECRET:randomBytes(32).toString('hex'),RESEND_API_KEY:'re_local_fixture',STRIPE_SECRET_KEY:'sk_test_local_fixture'}
const children=[]
children.push(spawn(process.execPath,['tests/browser/attendance-fixture-server.mjs'],{env,stdio:'inherit'}))
// Use dev here because this machine's Turbopack production worker cannot bind during build.
children.push(spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','3107','--hostname','127.0.0.1'],{env,stdio:'inherit'}))
for(const child of children)child.on('exit',()=>stop())
const gateway=createGateway({teacherToken,port:3107})
await new Promise(r=>gateway.listen(3106,'127.0.0.1',r))
console.log('Password-free fictional attendance preview ready')
function stop(){gateway.close();for(const child of children)child.kill();process.exit()}
process.on('SIGTERM',stop);process.on('SIGINT',stop)
setTimeout(stop,7200000)
