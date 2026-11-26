# BeatFirst engagement staging

The trainer awards 10 Rhythm Points for each saved round, 20 for the first passing score of 80 or more on each level, and 25 for the first signed-in check-in of each day. The account total follows the verified Google account. Guest rounds use the existing claim-and-save flow to count after sign-in.

The database uses **America/Los_Angeles** for check-ins. A day begins at midnight Pacific Time, with daylight saving handled by the database. The account keeps its longest streak. A missing calendar day starts a new current streak when the player returns.

Existing saved rounds and first passes count automatically. Previous round dates do not create retroactive daily bonuses or streaks. BeatFirst derives round points from the existing unique attempts and passing levels, and records a daily bonus once under the account-and-date constraint. The migration adds a check-in table and a service-role-only function. Saved scores, mastery stars, unlocks, and timing-based leaderboard entries keep using the existing data.

## Protected Vercel Preview

Vercel Previews built from `codex/beatfirst-engagement-staging` enable the engagement UI and isolate the BeatFirst app. Set `BEATFIRST_STAGING_ISOLATION=1` on CLI-uploaded BeatFirst staging deployments to select the same behavior without branch metadata. Other Preview deployments retain their usual routing. Every Preview requires the dedicated server-only credentials `BEATFIRST_STAGING_SUPABASE_URL` and `BEATFIRST_STAGING_SUPABASE_SERVICE_ROLE_KEY` for BeatFirst account progress. Configure this pair only for the staging branch or an individual Preview deployment. Apply the BeatFirst schema and rewards migration to the verified staging database before enabling account tests. Use an existing authorized OAuth callback and Vercel Deployment Protection.

Without that dedicated pair, the protected Preview serves the three guest levels with sign-in and all account APIs blocked. Staging skips production analytics and sign-in side effects. Keep the existing BeatFirst alias on its current deployment until the new hosted account configuration is verified.

Local verification uses `BEATFIRST_ENGAGEMENT_ENABLED=1` with a disposable BeatFirst database and the standard BeatFirst database credential pair. The production flag defaults off and should be enabled by a separate release after the schema is deployed.
