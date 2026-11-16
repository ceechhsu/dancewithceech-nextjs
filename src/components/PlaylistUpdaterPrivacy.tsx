export default function PlaylistUpdaterPrivacy() {
  return (
    <section id="playlist-updater" className="space-y-6">
      <h2 className="text-2xl font-semibold">Owner-operated YouTube playlist updater</h2>
      <p>Added November 16, 2026.</p>
      <p>{"Dance With Ceech uses an owner-operated helper to keep the “Quick Hip-Hop Tips from My Live Classes” playlist current. This helper is for the Dance With Ceech channel owner; it is not offered as a service for visitors to connect their YouTube accounts."}</p>
      <p>{"After the owner grants Google's YouTube account-management permission, the helper uses the official YouTube API to verify the channel, read uploaded-video and playlist information, and add only approved, already-public teaching Shorts that are missing from that playlist. Google's permission is broader than playlist additions. The helper does not use that broader permission to upload, edit or delete videos, or to change other playlists."}</p>
      <p>{"The OAuth client configuration and renewable authorization are stored in the owner's macOS Keychain. The helper does not collect the Google password. Its local configuration, approved-video catalog and reconciliation records contain non-secret identifiers, publication information, checks and results. Access tokens, refresh tokens and client secrets are excluded from logs and reports. These records are used to prevent duplicate additions, reconcile uncertain requests and diagnose failures. Local reconciliation records remain until the owner removes them; removing them without reconciliation can impair duplicate prevention."}</p>
      <p>{"The helper sends authorized API requests to Google/YouTube and does not sell this data, use it for advertising, or supply it for AI model training. Google's API data is used only to operate and verify this playlist feature, consistent with the Google API Services User Data Policy, including its Limited Use requirements. The website separately reads the public playlist feed; owner authorization tokens are not sent to the website or its visitors."}</p>
      <p>{"The owner can stop the local job and revoke the DanceWithCeech app's access at https://myaccount.google.com/permissions. Revocation stops future authorized access but does not remove existing public playlist entries. For local authorization and record deletion, contact dancewithceech@gmail.com. Reauthorizing requires the owner's approval again. YouTube's privacy policy is available at https://policies.google.com/privacy."}</p>
      <p><a className="underline" href="/terms">Playlist updater use terms</a></p>
    </section>
  )
}
