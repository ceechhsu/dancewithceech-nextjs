import { redirect, notFound } from 'next/navigation'
import { loadOwnerClass } from '@/lib/owner-dashboard/classes-server'
import { ClassViewError } from '@/lib/owner-dashboard/classes'
import { OwnerDashboardError } from '@/lib/owner-dashboard/server'
import ClassRoster from '@/components/owner-dashboard/ClassRoster'
export const dynamic='force-dynamic'
export const metadata={title:'Class register | DanceWithCeech',robots:{index:false,follow:false}}
export default async function OwnerClassPage({params}:{params:Promise<{classId:string}>}) {
 let data
 try {data=await loadOwnerClass((await params).classId)}
 catch(error){if(error instanceof OwnerDashboardError&&[401,403].includes(error.status))redirect('/admin');if(error instanceof ClassViewError&&error.status===404)notFound();return <main className="mx-auto max-w-xl px-6 py-24"><h1 className="text-3xl">Class records unavailable</h1><p>Please try again shortly.</p><a href="/admin">Return to owner dashboard</a></main>}
 return <ClassRoster initial={data}/>
}
