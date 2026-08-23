export const CURRENT_TERMS_VERSION = "running-man-2026-08-22" as const;

export const REQUIRED_COMMITMENTS = Object.freeze([
  Object.freeze({
    id: "active-practice-video-submissions",
    label: "I commit to active practice and submitting practice videos.",
  }),
  Object.freeze({
    id: "gradual-sharing-mastery-checkpoints",
    label: "I understand sharing is gradual and private Mastery Checkpoints are part of the process.",
  }),
  Object.freeze({
    id: "live-participation-graduation",
    label: "I commit to live participation and the graduation requirements.",
  }),
  Object.freeze({
    id: "adult-physical-readiness",
    label: "I confirm I am an adult and physically ready to participate.",
  }),
  Object.freeze({
    id: "refund-cancel-postponement",
    label: "I have read and accept the refund, cancellation, and postponement terms.",
  }),
] as const);
