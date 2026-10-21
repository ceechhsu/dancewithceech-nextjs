import { auth } from '@/auth'
import { handleAccountProfile } from '@/lib/trainer/api'
import { trainerIdentity } from '@/lib/trainer/session'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function profile(request:Request) { return handleAccountProfile(request,trainerIdentity(await auth())) }
export {profile as GET,profile as POST,profile as HEAD}
