import type { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message =
    err instanceof Error ? err.message : "Unexpected server error";
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
}
