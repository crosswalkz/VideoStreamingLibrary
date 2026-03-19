import { Response } from 'express';

/**
 * Sends a success JSON response.
 */
export function sendSuccess<T extends Record<string, unknown>>(
  res: Response,
  data: T,
  statusCode: number = 200
): void {
  res.status(statusCode).json(data);
}

/**
 * Sends an error JSON response with a consistent shape.
 */
export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  message: string
): void {
  res.status(statusCode).json({ error, message });
}
