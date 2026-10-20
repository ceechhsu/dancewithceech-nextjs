# Historical account email recovery — October 20, 2026

User authorized showing44 consistent stored Google-ID/email associations in the sole-owner dashboard. Rechecked observed46, missing-email45, unique matches44, conflicts0. All observedIDs are canonical Google account keys. No matching by name, proximity, photo or inferred identity.

Separate service-only owner_account_email_matches stores only user_id,email,source,actual matched_at and expiry90days later. It never creates recorded sign-in timestamps. Existing active directory email takes precedence. Per-account source label and matched timestamp are visible in details. Only already observed activity/directory accounts receive display associations.

One-time scripts/recover-owner-emails.sql reads only enrollment google_sub/email and attempt google_sub/actor_email, strips only literal leading google:, normalizes emails by trim/lowercase, and requires a single distinct email. It briefly locks identity/suppression tables, supports an exact expected-count guard, never overwrites previous recovery dates, excludes any existing directory row including expired, and verifies recorded directory timestamps unchanged. No raw records or personal account lists are returned.

Deletion uses atomic owner_directory_erase_account. Deletion/expiry triggers preserve a one-way account hash without email to suppress future historical recovery. Real Google sign-in removes the historical match and records only the genuine event; it does not clear recovery suppression. Daily cleanup now covers both email stores. Privacy notice and delete control describe this behavior. Attendance/practice records are unchanged.

Schema migration20261020173711 applied after the user's current connector approval. Earlier expired request-state attempts were verified not applied. Empty recovery table and private grants/invoker functions verified; original directory fingerprint unchanged. No emails imported until updated deletion API is deployed.

Verification:18focused tests, TypeScript, changed-file lint and build pass. Production HTTP fixture verifies historical email display without sign-in inflation, unknown identity preservation, independent failures, denied users cause zero backend reads, atomic erasure RPC and rejected foreign-origin/guest deletion. Fixed empty NextRequest DELETE streams while still rejecting any supplied body bytes. Independent review identified and verified the expired-directory suppression fix; no remaining important findings.
