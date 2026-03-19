import { Request, Response, NextFunction } from 'express';
import { sendValidationError } from './validation';

// ---------------------------------------------------------------------------
// POST /videos/upload — Expected params (single source of truth)
// ---------------------------------------------------------------------------
//
// Content-Type: multipart/form-data
//
// Form fields:
//   video  (required)  File   — Single video file. Field name must be "video".
//                              Allowed: video/* MIME. Max size: 500MB.
//   title  (optional) string — Video title. Stored in DB; omit or leave empty for null.
//                              If provided, must be a string, max 500 characters.
// ---------------------------------------------------------------------------

const TITLE_MAX_LENGTH = 100;

/** Expected params for POST /videos/upload. Use this to understand what the API accepts. */
export const UPLOAD_PARAMS = {
  video: {
    required: true,
    type: 'file',
    fieldName: 'video',
    description: 'Single video file (video/* MIME, max 500MB)',
  },
  title: {
    required: false,
    type: 'string',
    description: 'Video title (max 500 characters)',
    maxLength: TITLE_MAX_LENGTH,
  },
} as const;

const UPLOAD_EXPECTED = {
  field: 'video',
  type: 'video file (multipart/form-data)',
  maxSize: '500MB',
  allowedTypes: 'video/* (e.g. video/mp4, video/webm, video/ogg)',
} as const;

/**
 * Middleware: validates request for POST /videos/upload.
 * - Ensures a video file was uploaded (field "video").
 * - If title is present, ensures it is a string and within length limit.
 * Run after multer.
 */
export function validateVideoUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // req.file is the video file uploaded by the user (multer middleware)
  if (!req.file) {
    sendValidationError(
      res,
      'No file uploaded',
      `Expected a single video file in form field "${UPLOAD_EXPECTED.field}".`,
      { params: UPLOAD_PARAMS }
    );
    return;
  }
  //todo: remove this later
  console.log('req.body', req.body);
  console.log('req.file using multer middleware', req.file);
  

  const title = req.body?.title;
  if (title !== undefined && title !== null && title !== '') {
    if (typeof title !== 'string') {
      sendValidationError(
        res,
        'Invalid title',
        'If provided, title must be a string.',
        { params: UPLOAD_PARAMS }
      );
      return;
    }
    if (title.length > TITLE_MAX_LENGTH) {
      sendValidationError(
        res,
        'Invalid title',
        `Title must be at most ${TITLE_MAX_LENGTH} characters.`,
        { params: UPLOAD_PARAMS }
      );
      return;
    }
  }

  next();
}

// ---------------------------------------------------------------------------
// PATCH /videos/:id — Update video metadata (title)
// ---------------------------------------------------------------------------
//
// Content-Type: application/json
//
// Body:
//   title (optional) string — Video title. Omit or empty string for null.
//                             If provided, must be a string, max 100 characters.
// ---------------------------------------------------------------------------

/** Expected params for PATCH /videos/:id. Same title rules as upload. */
export const UPDATE_PARAMS = {
  title: {
    required: false,
    type: 'string',
    description: 'Video title (max 100 characters)',
    maxLength: TITLE_MAX_LENGTH,
  },
} as const;

/**
 * Middleware: validates request body for PATCH /videos/:id.
 * If title is present, ensures it is a string and within length limit.
 */
export function validateVideoUpdate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const title = req.body?.title;
  if (title !== undefined && title !== null && title !== '') {
    if (typeof title !== 'string') {
      sendValidationError(
        res,
        'Invalid title',
        'If provided, title must be a string.',
        { params: UPDATE_PARAMS }
      );
      return;
    }
    if (title.length > TITLE_MAX_LENGTH) {
      sendValidationError(
        res,
        'Invalid title',
        `Title must be at most ${TITLE_MAX_LENGTH} characters.`,
        { params: UPDATE_PARAMS }
      );
      return;
    }
  }
  next();
}
