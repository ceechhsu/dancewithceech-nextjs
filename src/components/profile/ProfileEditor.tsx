'use client'
/* Private settings use full-document navigation. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Check, ChevronLeft, LockKeyhole, UserRound } from 'lucide-react'
import { prepareProfilePhoto, type AccountProfile } from '@/lib/account-profile'
import styles from './Profile.module.css'

type Draft = Pick<AccountProfile, 'first_name' | 'last_name' | 'display_name' | 'photo_mode'>
const draftOf = (p: AccountProfile): Draft => ({ first_name: p.first_name, last_name: p.last_name, display_name: p.display_name, photo_mode: p.photo_mode })
function Portrait({ url, name, large=false }: { url: string; name: string; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <span className={`${styles.portrait} ${large ? styles.largePortrait : ''}`}>{url && !failed ? <img src={url} alt="Your profile photo" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span aria-label="Profile initials">{name.trim().slice(0, 1).toUpperCase() || <UserRound size={32} />}</span>}</span>
}

export default function ProfileEditor({ initial }: { initial: AccountProfile }) {
  const [saved, setSaved] = useState<AccountProfile | null>(initial)
  const [draft, setDraft] = useState<Draft>(draftOf(initial))
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [accessLost, setAccessLost] = useState(false)
  const generation = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const dirty = !!saved && (photo !== null || JSON.stringify(draft) !== JSON.stringify(draftOf(saved)))
  const clearAccess = () => {
    generation.current++
    setSaved(null); setPhoto(null); setDraft({ first_name: '', last_name: '', display_name: '', photo_mode: 'none' })
    setAccessLost(true); setMessage(''); setError('')
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    let active = true
    const pendingPhoto = generation
    const check = async () => {
      setChecking(true)
      try {
        const response = await fetch('/api/account/profile', { cache: 'no-store', headers: { 'x-profile-owner': initial.account } })
        if (active && [401, 403, 409].includes(response.status)) clearAccess()
      } catch { /* A connection failure does not discard an unsaved draft. POST rechecks identity. */ }
      finally { if (active) setChecking(false) }
    }
    window.addEventListener('focus', check)
    return () => { active = false; pendingPhoto.current++; window.removeEventListener('focus', check) }
  }, [initial.account])

  function reset() {
    generation.current++
    if (saved) setDraft(draftOf(saved))
    setPhoto(null); setMessage('Changes discarded.'); setError(''); setProcessing(false)
  }
  async function choosePhoto(file: File) {
    const version = ++generation.current
    setProcessing(true); setError(''); setMessage('Preparing photo…')
    try {
      const result = await prepareProfilePhoto(file)
      if (generation.current !== version) return
      setPhoto(result); setDraft(current => ({ ...current, photo_mode: 'custom' })); setMessage('Photo ready. Save changes to keep it.')
    } catch (failure) { if (generation.current === version) { setError(failure instanceof Error ? failure.message : 'This photo could not be read.'); setMessage('') } }
    finally { if (generation.current === version) { setProcessing(false); if (input.current) input.current.value = '' } }
  }
  function changePhoto(mode: 'google' | 'none') {
    generation.current++; setPhoto(null); setDraft(current => ({ ...current, photo_mode: mode })); setError(''); setMessage('')
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || processing || checking || !saved || !dirty) return
    setBusy(true); setError(''); setMessage('Saving…')
    try {
      const response = await fetch('/api/account/profile', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'x-profile-owner': saved.account }, body: JSON.stringify({ ...draft, ...(photo ? { photo_data: photo } : {}) }) })
      if ([401, 403, 409].includes(response.status)) { clearAccess(); return }
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Your profile could not be saved. Please retry.')
      setSaved(result); setDraft(draftOf(result)); setPhoto(null); setMessage('Profile saved.')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your profile could not be saved.'); setMessage('') }
    finally { setBusy(false) }
  }
  if (accessLost || !saved) return <section className={styles.accessLost}><LockKeyhole size={28} /><h1>Sign in to your profile again</h1><p>Your signed-in account changed or expired. The profile form has been cleared.</p><a href="/profile">Continue to profile</a></section>
  const preview = draft.photo_mode === 'custom' ? photo || saved.photo_url : draft.photo_mode === 'google' ? saved.google_photo_url : ''
  const nickname = draft.display_name.trim() || 'Your nickname'
  return <>
    <header className={styles.heading}><a className={styles.back} href="/dashboard"><ChevronLeft size={16} /> Your dashboard</a><p className={styles.eyebrow}>YOUR DANCE WITH CEECH ACCOUNT</p><h1>My profile</h1><p>A familiar face. A name that feels like you.</p></header>
    <div className={styles.layout}>
      <aside className={styles.preview} aria-label="Profile preview"><p className={styles.eyebrow}>IN YOUR CORNER</p><Portrait key={preview} url={preview} name={nickname} large /><h2>{nickname}</h2><p className={styles.fullName}>{[draft.first_name, draft.last_name].filter(Boolean).join(' ') || 'Your name'}</p><div className={styles.previewNote}><LockKeyhole size={15} /><p>Your Google account stays the same.<span>These changes belong to Dance With Ceech.</span></p></div></aside>
      <form className={styles.form} onSubmit={save}>
        <fieldset disabled={busy || processing || checking}><legend className={styles.srOnly}>Edit your profile</legend>
          <section className={styles.section} aria-labelledby="photo-heading"><div className={styles.sectionTitle}><span>01</span><h2 id="photo-heading">Your photo</h2></div><div className={styles.photoControls}><Portrait key={'edit-'+preview} url={preview} name={nickname} /><div><button type="button" className={styles.secondary} onClick={() => input.current?.click()}><Camera size={16} /> Upload photo</button><input ref={input} className={styles.srOnly} aria-label="Choose profile photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void choosePhoto(file) }} /><div className={styles.photoOptions}><button type="button" onClick={() => changePhoto('google')} disabled={!saved.google_photo_url}>Use Google photo</button><button type="button" onClick={() => changePhoto('none')}>Remove photo</button></div><p className={styles.hint}>JPG, PNG or WebP · up to 10 MB.<br />We’ll use a centered square crop.</p></div></div></section>
          <section className={styles.section} aria-labelledby="name-heading"><div className={styles.sectionTitle}><span>02</span><h2 id="name-heading">Your name</h2></div><div className={styles.names}><label htmlFor="profile-first">First name<input id="profile-first" autoComplete="given-name" maxLength={80} value={draft.first_name} onChange={e => { setDraft({ ...draft, first_name: e.target.value }); setMessage(''); setError('') }} /></label><label htmlFor="profile-last">Last name<input id="profile-last" autoComplete="family-name" maxLength={80} value={draft.last_name} onChange={e => { setDraft({ ...draft, last_name: e.target.value }); setMessage(''); setError('') }} /></label></div><label htmlFor="profile-nickname">Nickname<input id="profile-nickname" autoComplete="nickname" maxLength={40} required value={draft.display_name} aria-describedby="nickname-help" onChange={e => { setDraft({ ...draft, display_name: e.target.value }); setMessage(''); setError('') }} /></label><p id="nickname-help" className={styles.hint}>Starts with your Google name. Choose the name you want to use in new practice challenges—up to 40 characters, without an email address.</p></section>
          <section className={styles.section} aria-labelledby="account-heading"><div className={styles.sectionTitle}><span>03</span><h2 id="account-heading">Google sign-in</h2></div><label htmlFor="profile-email">Sign-in email<input id="profile-email" type="email" value={saved.email} readOnly aria-describedby="email-help" /></label><p id="email-help" className={styles.hint}>Managed by Google. Editing this profile won’t change your Google account, login email or class roster.</p></section>
        </fieldset>
        <div className={styles.saveBar}><button type="submit" className={styles.primary} disabled={!dirty || busy || processing || checking}>{busy ? 'Saving…' : processing ? 'Preparing photo…' : 'Save changes'}{!busy && !processing && <Check size={16} />}</button><button type="button" className={styles.cancel} onClick={reset} disabled={!dirty || busy || checking}>Cancel changes</button><p role="status" aria-live="polite">{message || (dirty ? 'Unsaved changes' : 'Up to date')}</p></div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </form>
    </div>
    <footer className={styles.footer}><a href="/practice/">Practice library</a><a href="/privacy">Account data &amp; privacy</a><span>Made for your next step.</span></footer>
  </>
}
