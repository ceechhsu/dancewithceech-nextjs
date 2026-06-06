export const marchingOnBeatChallenge = {
  id: "marching-on-beat-check",
  title: "Marching",
  demoVideo: "edit/Marching%20-%208%20bars_demo_540p.mp4",
  referenceGhostVideo: "edit/Marching%20-%208%20bars_ghost_alpha.webm",
  referenceGhostFallbackVideo: "edit/Marching%20-%208%20bars_ghost_540p.mp4",
  challengeAudio: "edit/marching-on-beat-check-audio.wav",
  referenceAudioStartSeconds: 0,
  referenceSourceSha256: "1dfa705fef31f7ac7415cba9a01d1f58371dc089e64115adc81f723a2c89efc1",
  beatMap: "edit/Marching%20-%208%20bars_detected_beats.json",
  referenceContacts: "edit/Marching%20-%208%20bars_detected_contacts.json",
  referencePose: "edit/Marching%20-%208%20bars_reference_pose_30fps.json",
  beatMapVersion: "marching-v1",
  requestedFacingMode: "user",
  challengeDurationSeconds: 21.61,
  postRollSeconds: 1,
};

export const twoStepChallenge = {
  id: "2-step",
  title: "2 Step",
  demoVideo: "edit/2step_8_bars_demo_540p.mp4?v=2step-timeline-v2",
  referenceGhostVideo: "edit/2step_8_bars_ghost_alpha.webm",
  referenceGhostFallbackVideo: "edit/2step_8_bars_ghost_540p.mp4",
  challengeAudio: "edit/2-step-audio.wav?v=2step-timeline-v2",
  referenceAudioStartSeconds: 0,
  referenceSourceSha256: "c608986033d35425fcfa29f4426aecaea567231287e334a26b4b2047d5f6e02f",
  beatMap: "edit/2step_8_bars_detected_beats.json",
  referenceContacts: "edit/2step_8_bars_detected_contacts.json",
  referencePose: "edit/2step_8_bars_reference_pose_30fps.json",
  beatMapVersion: "2-step-v1",
  requestedFacingMode: "user",
  challengeDurationSeconds: 21.6,
  postRollSeconds: 1,
  contactDetection: {
    recoverReferenceGhostContacts: true,
    useReferenceFootHints: true,
    recoverLateralContacts: true,
  },
};

export const challenges = [
  marchingOnBeatChallenge,
  twoStepChallenge,
];

export function getChallengeById(challengeId) {
  return challenges.find((challenge) => challenge.id === challengeId) || null;
}
