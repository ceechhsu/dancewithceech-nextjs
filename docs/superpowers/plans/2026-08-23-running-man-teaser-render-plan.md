# Running Man Teaser Render Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render a verified approximately 16-second Option A landing-page teaser from the approved Running Man footage and voiceover.

**Architecture:** Use the untouched source MP4 and M4A as inputs. Create an intermediate audio mix with the original music ducked under the voiceover, then render a single preview with FFmpeg filters for the branded inset cover, clean kinetic captions, and one-second end card. Keep every generated file under `videos/edit/`.

**Tech Stack:** FFmpeg/ffprobe, H.264/AAC MP4, SRT/ASS-style caption overlay, existing source assets.

---

### Task 1: Prepare and inspect the audio mix

**Files:**
- Source: `videos/running-man-demo.mp4`
- Source: `videos/running-man-voice-over.m4a`
- Create: `videos/edit/audio/voiceover-mix.wav`

- [ ] Extract the source music track and voiceover to matching 48 kHz stereo WAV files.
- [ ] Place the voiceover at output time 0.00–14.53 seconds; keep source music underneath it, ducked 10–14 dB, then let the music fade under the 14.53–15.00 second transition and end-card interval. During pauses of at least 0.35 seconds, recover the music by about 3 dB over 120 ms, then return to the ducked level before the next phrase; accept only a mix where the voice remains clearly dominant.
- [ ] Mix the voiceover above the music, pad/fade the final audio to 16.00 seconds, target approximately -16 LUFS integrated with true peaks below -1 dBTP, and verify the result with `loudnorm` analysis.
- [ ] Run `ffmpeg -af volumedetect`/`loudnorm` and listen to the mix before rendering video.

### Task 2: Define captions and overlays

**Files:**
- Create: `videos/edit/captions/running-man-option-a.ass`
- Create: `videos/edit/overlays/running-man-method-label.png`
- Create: `videos/edit/overlays/end-card.png`

- [ ] Use short caption groups synchronized to the voiceover, maximum two lines, inside a 72-pixel safe margin. Initial cue table: `0.25–1.65 THIS IS THE / RUNNING MAN`; `1.65–4.85 IN MY FOUR-WEEK / PROGRAM`; `4.85–8.55 I’LL TEACH YOU THE / RHYTHM, BALANCE`; `8.55–11.65 AND COORDINATION / BEHIND THIS MOVE`; `11.65–12.90 STEP BY STEP`; `12.90–14.53 WITH PERSONAL FEEDBACK— / SO YOU CAN DANCE IT WITH CONFIDENCE`. Adjust only after listening to the recorded voiceover.
- [ ] Emphasize `rhythm`, `balance`, `coordination`, and `personal feedback` in `#FBBF24` yellow; use white for supporting text and `#60A5FA` blue for the method label. Use a bold sans-serif font, 42–48 px at 1280×720, with a dark translucent shadow/plate for contrast. Animate each caption with a restrained 12-pixel upward `ASS \\move` transition over 180 ms; no bouncing or oversized kinetic effects.
- [ ] Cover the upper-right picture-in-picture inset with a `#0B1220` rectangle at approximately x=972, y=0, w=308, h=176, then place `RUNNING MAN METHOD` in 11 px blue/yellow uppercase text inside it. Keep both dancers fully visible.
- [ ] Build a 1280×720 `#0B1220` end card from output 15.00–16.00 seconds, fade in over 0.20 seconds, hold `LEARN THE RUNNING MAN — STEP BY STEP` with the first phrase in white and the second in yellow, then fade audio out over the final 0.20 seconds.

### Task 3: Render and self-verify the preview

**Files:**
- Create: `videos/edit/running-man-teaser-option-a-preview.mp4`
- Create: `videos/edit/verify/preview-contact.jpg`

- [ ] Use source footage from 0.00–15.00 seconds, preserving the opening demonstration and final complete movement; reserve output 15.00–16.00 seconds for the end card.
- [ ] Apply the mixed audio, captions last, inset cover, and end card.
- [ ] Run ffprobe to verify 1280×720 (16:9), H.264 video, AAC audio, and 15.8–16.2 seconds duration.
- [ ] Inspect the first two seconds, every caption transition, the inset cover at x=972–1280/y=0–176, and the final two seconds for flashes, pops, hidden captions, cropped dancers, or unreadable end-card text.
- [ ] Show the preview to the user for approval before creating the final export.

### Task 4: Final export after approval

**Files:**
- Create: `videos/edit/running-man-teaser-option-a-final.mp4`

- [ ] Render the final export from the same approved timeline.
- [ ] Verify duration, audio/video streams, caption readability, and web playback compatibility.
- [ ] Leave the source MP4 and M4A untouched.
