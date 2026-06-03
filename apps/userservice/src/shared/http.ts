import type { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "@repo/logger";
import { Prisma } from "../generated/prisma/client";

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
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: "UNIQUE_CONSTRAINT_VIOLATION",
          message: "A record with these values already exists",
        },
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        error: { code: "RECORD_NOT_FOUND", message: "Record not found" },
      });
      return;
    }
  }

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
