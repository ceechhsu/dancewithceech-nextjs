# Musical timing through background sound — alignment version 5

A real noisy Marching recording was rejected by version 4 before step analysis. Its broadband loudness correlation was about 0.60, below 0.65, with nearly equal incorrect matches one and two repeating sections earlier. Lowering that threshold alone would not reliably identify the correct musical position. The owner manually moved the take 295 ms later; independent frequency-band checks found approximately 296 ms throughout all four dance bars.

Version 5 preserves the existing clean full-dance matching path. If that path cannot verify the recording, it measures short-time energy in five independent frequency ranges and searches for the complete 16-beat dance pattern. Constant gain and unrelated sound in another frequency range need not change the musical timing. The dance supplies the candidate and four-bar refinement; the four prefix musical positions corroborate the complete-track boundary without selecting the offset from spoken syllables. No foot movement or timing-score target enters alignment.

The additional path requires support across every bar, at least three of each bar's four dance positions and 75% of the dance overall, a supported final beat, and supporting beginning evidence. Bar offsets must span at most 30 ms. A competing complete match must be clearly weaker; a repeating section with further matching music beyond its supposed ending is rejected. These heuristics tolerate obscured hits without promising recovery when the music is overwhelmed or ambiguous. One constant offset applies to both videos and scoring; the app never retimes individual steps or stretches playback.

Automatic alignment cache version is now 5. Reopening a saved comparison rechecks old automatic alignment once while retaining reusable foot tracking. Owner-confirmed signed manual alignment keeps its existing priority. No recording, reference video, scoring threshold, account, challenge, reward, or database migration is part of this change.

## Verification before publication

- Seven new pipeline tests cover loud unrelated background sound, unequal beat volumes, positive/negative shifts, 48 kHz stereo polarity, obscured hits, unrelated soundtrack, clock changes and incomplete endings.
- All 198 prototype JavaScript checks and 65 hosted trainer JavaScript checks pass. Seven trainer server/identity/SQL checks pass with the server-component module condition.
- Twelve real recorded pairs were replayed. Earlier verified offsets remained unchanged; the earlier drifting recording remains rejected. The latest noisy take is accepted at -296 ms in the app's student-minus-reference convention (move the take +296 ms on the manual reference timeline), with all 20 musical positions supported.
- Actual browser AAC decoding independently produced the same -296 ms result, all 16 dance positions and all four prefix positions supported, with a 2 ms bar spread. Audio matching took approximately 186 ms on this Mac; that is not a phone performance measurement.
- The real comparison page completed on-device step analysis and showed 16 estimated steps. This verifies completion of the formerly blocked workflow; it does not establish ground-truth foot-contact accuracy.
- The website production build and changed-file lint pass. The repository-wide lint command still reports 13 errors in unchanged third-party model/parser bundles; it is not described as a passing full lint run.

Physical-phone confirmation of the same saved noisy take is the remaining user check after installation. Refresh and reopen that comparison; no replacement recording or upload is necessary. The prior production deployment remains available for application rollback, with no database reversal required.
