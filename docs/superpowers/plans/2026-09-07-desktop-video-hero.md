# Desktop Video Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the desktop scrolly-telly homepage hero with the existing looping video hero while preserving the current message and conversion links.

**Architecture:** Keep `ScrollyHero` as the single responsive hero component, remove the desktop canvas/GSAP path, and render shared video-backed presentation for both breakpoints. Use a real existing image as the poster and CSS media-query behavior for reduced motion.

**Tech Stack:** Next.js App Router, React, TypeScript, inline styles, existing `/public/hero-mobile.mp4` asset.

---

### Task 1: Add the video hero behavior

**Files:**
- Modify: `src/components/ScrollyHero.tsx`
- Modify: `tests/hero-frame-loader.test.ts` only if obsolete scrolly-loader assertions prevent the new behavior from being tested

- [ ] **Step 1: Add a focused source-level test for the shared video hero contract.** Assert that the hero uses `/hero-mobile.mp4`, has `muted`, `playsInline`, `poster`, and includes the existing booking and About links.
- [ ] **Step 2: Run the focused test and confirm it fails against the current canvas-first implementation.**
- [ ] **Step 3: Replace the desktop canvas/ScrollTrigger markup with the video-backed hero, keeping the existing text and links unchanged.** Use a real existing poster asset, preserve the dark overlays, and make the video static for reduced-motion users.
- [ ] **Step 4: Run the focused test and confirm it passes.**
- [ ] **Step 5: Run lint and the production build.**
- [ ] **Step 6: Start the local app and inspect the homepage at desktop and mobile widths.** Confirm immediate headline/CTA visibility, correct video crop, readable contrast, no extra desktop scroll height, and unchanged content below the hero.

