/* Full document navigation isolates private data from previously loaded marketing scripts. */
/* eslint-disable @next/next/no-html-link-for-pages */
'use client'
import { useState } from 'react'
import { Activity, ArrowUpRight, LockKeyhole, Search, ShieldCheck } from 'lucide-react'
import type { Overview, Service } from '@/lib/owner-dashboard/model'
import styles from './Dashboard.module.css'
const names = { beatfirst: 'BeatFirst', trainer: 'Practice trainer' }
function time(value: string | null) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }).format(new Date(value))
}
export default function Dashboard({ initial }: { initial: Overview }) {
  const [data, setData] = useState(initial)
  const [query, setQuery] = useState('')
  const [service, setService] = useState<'all' | Service>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [accessLost, setAccessLost] = useState(false)
  const available = (id: string) => data.coverage.some(source => source.id === id && source.state !== 'unavailable')
  const accounts = data.accounts.filter(account => (!query.trim() || `${account.email ?? ''} ${account.id}`.toLowerCase().includes(query.toLowerCase().trim())) && (service === 'all' || account[service] > 0))
  const signIns = data.accounts.filter(account => account.lastSignIn).length
  async function refresh() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' })
      if ([401, 403, 404].includes(response.status)) {
        setData({ ...data, accounts: [], activity: [] })
        setQuery('')
        setAccessLost(true)
        return
      }
      if (!response.ok) throw new Error('Could not refresh. The previous snapshot is still shown.')
      setData(await response.json())
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not refresh.') }
    finally { setBusy(false) }
  }
  if (accessLost) return <div className={styles.shell}><main className={styles.main}><h1>Owner access required</h1><p>Your owner session is no longer available. The private snapshot has been cleared.</p><a href="/admin">Sign in again</a></main></div>
  return <div className={styles.shell}>
    <aside className={styles.rail}>
      <a className={styles.brand} href="/">DANCE<span>WITH CEECH</span></a>
      <p className={styles.eyebrow}>Studio / Owner</p>
      <nav aria-label="Owner navigation"><a href="#accounts" className={styles.current}><Activity size={17} /> Account activity</a><a href="#coverage"><ShieldCheck size={17} /> Data & privacy</a></nav>
      <div className={styles.railFoot}><LockKeyhole size={17} /><p>Private workspace<span>Owner access only</span></p></div>
    </aside>
    <main className={styles.main}>
      <div className={styles.topline}><span>DanceWithCeech.com</span><span><LockKeyhole size={13} /> Owner only</span></div>
      {data.demo && <div className={styles.demo} role="note"><strong>LOCAL DESIGN PREVIEW</strong><span>All accounts and activity below are synthetic. No production data is connected.</span><a href="/admin">Open protected dashboard <ArrowUpRight size={15} /></a></div>}
      <header className={styles.header}><div><p className={styles.eyebrow}>THE PRACTICE REGISTER</p><h1>Who’s finding their rhythm?</h1><p>See recorded sign-ins and saved practice. Know where the evidence stops.</p></div><button onClick={refresh} disabled={busy || data.demo} title={data.demo ? 'Synthetic preview is a fixed snapshot' : undefined}>{busy ? 'Refreshing…' : 'Refresh snapshot'}</button></header>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <section className={styles.summary} aria-label="Snapshot summary">
        <div className={styles.heroMetric}><p>Observed accounts</p><strong>{data.accounts.length}</strong><span>Within the loaded records</span></div>
        <div><p>Recorded sign-ins</p><strong>{available('directory') ? signIns : '—'}</strong><span>{available('directory') ? 'Accounts with a sign-in record' : 'Directory unavailable'}</span></div>
        <div><p>Saved practice records</p><strong>{available('beatfirst') || available('trainer') ? data.accounts.reduce((total, account) => total + account.beatfirst + account.trainer, 0) : '—'}</strong><span>Rounds + scores in connected sources</span></div>
        <div><p>Active time</p><strong className={styles.unknown}>Not measured</strong><span>Across all services</span></div>
      </section>
      <section id="accounts" className={styles.register}>
        <div className={styles.sectionHeading}><div><h2>Account activity</h2><p>Emails come from recorded Google sign-ins or exact historical account matches. Times in UTC.</p></div><span className={styles.count}>{accounts.length} shown</span></div>
        <div className={styles.toolbar}><label className={styles.search}><Search size={17} /><span className={styles.srOnly}>Search email or account ID</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search email or account ID" /></label><div role="group" aria-label="Filter by service" className={styles.filters}>{(['all', 'beatfirst', 'trainer'] as const).map(value => <button key={value} aria-pressed={service === value} onClick={() => setService(value)}>{value === 'all' ? 'All accounts' : names[value]}</button>)}</div></div>
        <p className={styles.mobileHint}>Swipe the table to view all columns.</p>
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Account register, scroll to view all columns"><table><caption className={styles.srOnly}>Observed accounts, recorded sign-ins, and saved practice counts</caption><thead><tr><th scope="col">Account</th><th scope="col">Last sign-in</th><th scope="col">BeatFirst rounds</th><th scope="col">Trainer scores</th><th scope="col">Last saved activity</th><th scope="col">Active time</th></tr></thead><tbody>{accounts.map(account => <tr key={account.id}><td><div className={styles.person}><span className={styles.avatar} aria-hidden="true">{account.email ? account.email[0].toUpperCase() : '·'}</span><div><strong>{account.email || 'Email not recorded'}</strong>{account.emailSource === 'historical-match' && <span className={styles.cellNote}>Historical account match</span>}<details><summary>Account details</summary><p className={styles.accountId}>{account.id}</p><p>First recorded sign-in: {time(account.firstSignIn)}</p>{account.emailSource === 'historical-match' && <p>Email matched from a previously saved attendance account record on {time(account.emailMatchedAt)} UTC. This is not a recorded website sign-in.</p>}</details></div></div></td><td>{time(account.lastSignIn)}{account.lastSignIn && <span className={styles.cellNote}>Verified Google sign-in</span>}</td><td>{available('beatfirst') ? account.beatfirst : 'Unavailable'}</td><td>{available('trainer') ? account.trainer : 'Unavailable'}</td><td>{time(account.lastActivity)}</td><td className={styles.muted}>Not measured</td></tr>)}</tbody></table></div>
        {accounts.length === 0 && <div className={styles.empty}><Search size={24} /><h3>{query || service !== 'all' ? 'No matching accounts' : 'No account records available'}</h3><p>{query || service !== 'all' ? 'Try another email or reset the filters.' : 'Connect an approved data source to see saved activity. Sign-in-only accounts were not historically recorded.'}</p>{(query || service !== 'all') && <button onClick={() => { setQuery(''); setService('all') }}>Reset filters</button>}</div>}
        <p className={styles.footnote}>All nonexpired recorded sign-ins; at most 2,000 latest practice records per source. Counts cover loaded records, not lifetime activity. No saved records does not prove someone never practiced.</p>
      </section>
      <div className={styles.lower}>
        <section className={styles.panel}><div className={styles.sectionHeading}><h2>Latest saved activity</h2><span className={styles.count}>Server save time</span></div><ol className={styles.events}>{data.activity.slice(0, 6).map((event, index) => <li key={`${event.user_id}-${event.saved_at}-${index}`}><span className={styles.beat} aria-hidden="true" /><div><strong>{event.description}</strong><p>{data.accounts.find(account => account.id === event.user_id)?.email || 'Account without a recorded email'} · {names[event.service]}</p></div><time dateTime={event.saved_at}>{time(event.saved_at)}</time></li>)}</ol>{!data.activity.length && <p className={styles.muted}>No saved activity available in this snapshot.</p>}<p className={styles.footnote}>A save can arrive after offline practice. It is not a sign-in or an active-time measurement.</p></section>
        <section className={styles.panel}><div className={styles.sectionHeading}><h2>Time by service</h2><span className={styles.count}>Coverage</span></div>{['BeatFirst', 'Practice trainer', 'Dance lesson library'].map(name => <div className={styles.serviceTime} key={name}><span>{name}</span><strong>Not measured</strong></div>)}<p className={styles.footnote}>Round length, video length, open tabs, and gaps between saves cannot tell us how long someone actively practiced.</p></section>
      </div>
      <section id="coverage" className={styles.privacy}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>TRUST THE LIMITS</p><h2>Data coverage & privacy</h2></div><ShieldCheck size={24} /></div><div className={styles.coverage}>{data.coverage.map(source => <article key={source.id}><div><h3>{source.name}</h3><span className={source.state === 'available' ? styles.status : styles.warning}>{data.demo ? 'Example only' : source.state === 'available' ? 'Connected' : source.state === 'limited' ? 'Partial snapshot' : 'Unavailable'}</span></div><p>{source.detail}</p></article>)}</div><div className={styles.policy}><strong>Sign-in recording is enabled.</strong><p>Verified Google sign-ins are recorded from October 20, 2026, including accounts with no saved practice. Directory records expire 90 days after the latest recorded sign-in. Historical email matches expire 90 days after recovery. Daily cleanup deletes expired email records; deletion and expiry prevent historical reimport. Historical sign-ins and active minutes cannot be recovered.</p><p><a href="/privacy">Account-data notice and deletion</a></p><p>Attendance, payments, locations, videos and private notes are excluded from this view.</p></div></section>
      <footer className={styles.footer}><span>{data.demo ? 'Synthetic snapshot' : 'Snapshot'} · {time(data.generatedAt)} UTC</span><span>No historical time estimates</span></footer>
    </main>
  </div>
}
