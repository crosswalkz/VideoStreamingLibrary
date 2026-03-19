/**
 * Video status values used across the app (DB, list filter, transcoding).
 * Use these constants instead of string literals.
 */
export const VIDEO_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
  TERMINATED: 'terminated',
  DISCARDED: 'discarded',
} as const;

export type VideoStatus = (typeof VIDEO_STATUS)[keyof typeof VIDEO_STATUS];

/** All valid statuses (e.g. for query validation). */
export const VIDEO_STATUSES: readonly VideoStatus[] = Object.values(VIDEO_STATUS);
