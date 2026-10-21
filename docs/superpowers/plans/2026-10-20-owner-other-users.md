# Other users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add an owner-only Other users entry alongside Classes, showing known account emails outside the four current rosters.

**Architecture:** Reuse the existing account overview and private dashboard presentation. A server-only membership read validates the same four current class identities and loads only Google subject/email from active enrollments, then removes exact subject or normalized email matches. No new identity storage, sign-in records, or browsing analytics. Failure to load any roster prevents classification rather than incorrectly labeling students as outsiders.

**Tech Stack:** Next.js, React, existing server Supabase client, node:test/tsx.

### Task 1: Membership classification

Files: create `src/lib/owner-dashboard/other-users.ts`, `src/lib/owner-dashboard/other-users-server.ts`, `tests/owner-other-users.test.ts`.

- [x] Write and observe failing tests for exact Google-subject matching, normalized exact emails, no substring/name matching, unknown identities, historical labels/timestamps unchanged, matching activity only, fail-closed authorization/source failure.
- [x] Implement pure filtering and gated loader with injected dependencies. Validate all four class metadata before any roster read. Paginate stable current enrollment identity reads; never select attendance/token/location/private notes or return roster identities.
- [x] Run focused tests, TypeScript and lint.

### Task 2: Private menu and page

Files: modify `src/components/owner-dashboard/OwnerSidebar.tsx`, `Dashboard.tsx`; add `src/app/admin/other-users/page.tsx`, `src/app/api/admin/other-users/route.ts`.

- [x] Add top-level Other users menu item, separate from Classes, with current-page styling.
- [x] Reuse Dashboard with other-users scope, correct title/counts/refresh URL and meaningful empty/error states; retain provenance labels and unknown sign-in dates. Explain four-class current roster scope.
- [x] Add dynamic owner-only page/API using shared no-store/privacy protections. Never expose a partial membership classification.
- [x] Extend production HTTP fixture to test owner output, fail-closed roster failure, guest/ordinary/unverified denials before reads, and read-only API.

### Task 3: Release

- [x] Focused regression tests, TypeScript, scoped lint, optimized build and production HTTP fixture.
- [x] Independent review; resolve material findings.
- [ ] Commit and deploy exact source, test staged deployment, promote, verify live actual owner UI desktop/phone and guest denial.
- [ ] Push main/scoped branch, document nonidentifying verification and leave Other users open.
