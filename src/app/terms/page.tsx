import Link from 'next/link'
export const metadata = { title: 'Playlist updater use terms | DanceWithCeech' }
export default function PlaylistUpdaterTerms() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-20 leading-relaxed">
      <Link href="/">Dance With Ceech</Link>
      <h1 className="text-4xl font-bold">Playlist updater — use terms</h1>
      <p>Effective November 16, 2026.</p>
      <p>{"This page describes the owner-operated Dance With Ceech YouTube playlist helper. It is not a public account-connection service and these terms do not replace separate terms for classes, purchases or other website features."}</p>
      <p>{"Only the authorized Dance With Ceech channel owner may connect this helper. The owner chooses the approved teaching-video catalog and can stop the helper or revoke its Google authorization at any time. The helper adds eligible, already-public videos to the designated teaching playlist; it does not publish videos or change their schedules."}</p>
      <p>{"The helper uses YouTube API Services. Use of those services is subject to YouTube's Terms of Service at https://www.youtube.com/t/terms. Its data practices are described at https://dancewithceech.com/privacy. Questions and deletion requests: dancewithceech@gmail.com."}</p>
      <p>{"Updates depend on the Mac being awake, a working network, available Keychain authorization and Google's service availability. A scheduled check does not guarantee an addition at an exact minute. Unverified or ambiguous results are held for review rather than treated as successful."}</p>
      <p><Link className="underline" href="/privacy#playlist-updater">Owner-updater privacy disclosure</Link></p>
      <p><a className="underline" href="https://www.youtube.com/t/terms">YouTube Terms of Service</a> · <a className="underline" href="https://policies.google.com/privacy">Google Privacy Policy</a></p>
    </main>
  )
}
