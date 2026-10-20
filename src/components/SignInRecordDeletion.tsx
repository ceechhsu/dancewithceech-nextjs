
'use client'
import { useState } from 'react'
export default function SignInRecordDeletion() {
 const [busy,setBusy] = useState(false), [message,setMessage] = useState('')
 async function erase() {
  setBusy(true);setMessage('')
  try {
   const result = await fetch('/api/account/signin-record',{method:'DELETE'})
   setMessage(result.ok ? 'Your sign-in directory record has been deleted. Signing in again creates a new record. Saved practice results are unchanged.' : result.status === 401 ? 'Sign in to delete your own directory record, or email the contact below.' : 'Could not delete the record. Try again or email the contact below.')
  } catch { setMessage('Could not connect. Please try again.') }
  finally { setBusy(false) }
 }
 return <div><button className="my-4 rounded border border-white/30 px-4 py-3" disabled={busy} onClick={erase}>{busy ? 'Deleting…' : 'Delete my sign-in record'}</button><p role="status">{message}</p></div>
}
