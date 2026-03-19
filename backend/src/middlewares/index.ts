/**
 * Middlewares barrel.
 * Add new middleware files here (e.g. auth.ts, logging.ts) and re-export.
 */
export {
  sendValidationError,
  validateBody,
  type BodySchema,
  type FieldRule,
  type ValidationErrorResponse,
} from './validation';
export { validateVideoUpload, validateVideoUpdate, UPLOAD_PARAMS, UPDATE_PARAMS } from './videoValidation';
