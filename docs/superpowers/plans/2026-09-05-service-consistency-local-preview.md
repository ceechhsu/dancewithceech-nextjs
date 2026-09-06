# Service consistency: local review only

Approved scope: retire all public Academy promotion and signup; retain its code recoverably; update virtual coaching wording; clarify the existing private-lessons page; update Ceech's teaching history; align visible FAQs and structured data. Preserve the current design and approved prices. No deployment, new service page, subscription, or paid Calendly setup.

- [x] Add regression checks for retired Academy links, current workflow, evaluation privacy, credentials, and FAQ/schema consistency. Run them before implementation to confirm failures.
- [x] Remove Academy cards from navigation, homepage, blog/style templates, links page, and BeatFirst. Remove sitemap and legacy promotional redirects. Archive the page and signup code; make retired endpoints unavailable without touching subscriber data.
- [x] Replace service Zoom references and unspecified paid-program instructions. Update VideoEvalForm without promising a fixed response-video duration or private unlisted YouTube access.
- [x] Add a concise instructor introduction, separate lesson processes, wedding/celebration details, location, and practical FAQs to the existing private-lessons page. Preserve testimonials, prices, images, and consultation booking.
- [x] Correct About credentials (teaching since 1998, Mission College since 2002, MA in Kinesiology). Use shared business identity and visible FAQ data on location pages.
- [x] Run regression tests, type/build checks, and desktop/mobile browser checks. Confirm retired Academy routes and signup cannot be used.
- [x] Show the main private-lessons page on localhost for approval. Review remaining affected pages afterward. Do not deploy.

Paid virtual cycle: video submission, recorded feedback within three business days, then next available 30-minute Google Meet arranged with Ceech. Private paid booking link will be configured later. The existing free 30-minute phone consultation is separate.

## Verification

- Production build passed locally (Google Fonts required network access).
- All 153 automated tests passed; TypeScript passed; git diff whitespace check passed.
- Targeted lint: no errors; one pre-existing ProgressTab chart-effect dependency warning remains outside this change.
- Browser checks passed at 1920x1080, 768x1024, and 375x667: no horizontal overflow, one main heading, FAQ/schema parity, FAQ expansion, pricing-to-consultation scroll.
- Fifteen representative public routes returned 200 with no Academy links; /academy and retired legacy aliases returned 404; retired signup and count endpoints returned 410.
- Sitemap and both AI-readable page lists contain no Academy links or Zoom service references.
- Screenshots: /private/tmp/dwc-service-preview-aVpWqI (desktop/tablet/mobile).
- Preview server: http://127.0.0.1:3000/private-lessons. User review pending. No deployment performed.
- Existing Academy files preserved as text in docs/archive/academy-2026-09-05; no remote subscriber records changed.
- Structured-data references: https://schema.org/Service, https://schema.org/LocalBusiness, https://developers.google.com/search/docs/appearance/structured-data/sd-policies.
