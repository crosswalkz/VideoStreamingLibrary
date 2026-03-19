import { Request, Response, NextFunction } from 'express';

export interface ValidationErrorResponse {
  error: string;
  message: string;
  expected?: Record<string, unknown>;
}

/**
 * Sends a 400 validation error with a consistent shape.
 * Use from validation middlewares when params/body don't match expected schema.
 */
export function sendValidationError(
  res: Response,
  error: string,
  message: string,
  expected?: Record<string, unknown>
): void {
  const body: ValidationErrorResponse = { error, message };
  if (expected) body.expected = expected;
  res.status(400).json(body);
}

/**
 * Validation rule for a single field (body/query/params).
 */
export interface FieldRule {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
}

/**
 * Schema of expected fields for request body validation.
 * Use with validateBody(schema) for POST/PUT APIs.
 */
export type BodySchema = Record<string, FieldRule>;

function getFieldType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Middleware that validates req.body against expected schema.
 * Sends 400 with expected params description on mismatch.
 * Use for POST/PUT endpoints that expect a JSON body.
 */
export function validateBody(schema: BodySchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body ?? {};
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const [key, rule] of Object.entries(schema)) {
      const value = body[key];
      const present = key in body && value !== undefined && value !== null;

      if (rule.required !== false && !present) {
        missing.push(key);
        continue;
      }

      if (!present) continue;

      const actualType = getFieldType(value);
      if (actualType !== rule.type) {
        invalid.push(`${key} (expected ${rule.type}, got ${actualType})`);
      }
    }

    if (missing.length > 0) {
      const expected = Object.fromEntries(
        Object.entries(schema).map(([k, r]) => [
          k,
          { type: r.type, required: r.required !== false },
        ])
      );
      sendValidationError(
        res,
        'Missing required fields',
        `Missing: ${missing.join(', ')}.`,
        { body: expected }
      );
      return;
    }

    if (invalid.length > 0) {
      const expected = Object.fromEntries(
        Object.entries(schema).map(([k, r]) => [k, { type: r.type }])
      );
      sendValidationError(
        res,
        'Invalid field types',
        invalid.join(' '),
        { body: expected }
      );
      return;
    }

    next();
  };
}
