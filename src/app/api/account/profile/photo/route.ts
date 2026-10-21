import { auth } from '@/auth'
import { handleAccountProfile } from '@/lib/trainer/api'
import { trainerIdentity } from '@/lib/trainer/session'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function photo(request:Request) { return handleAccountProfile(request,trainerIdentity(await auth()),true) }
export {photo as GET,photo as HEAD}
