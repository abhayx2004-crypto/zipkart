import type { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "@repo/logger";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "APP_ERROR",
  ) {
    super(message);
  }
}

export const asyncHandler =
  (handler: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200) => {
  res.status(statusCode).json({ success: true, data });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  logger.error(error);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
  });
};
