import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.db";
import { verifyAccessToken } from "../services/crypto.service";
import { AppError } from "../shared/http";

export type AuthContext = {
  userId: string;
  sessionId: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  auth: AuthContext;
};

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;

    if (!token) {
      throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    }

    const payload = verifyAccessToken(token);
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revoked: false,
        expiresAt: { gt: new Date() },
        user: { isActive: true },
      },
      include: { user: true },
    });

    if (!session) {
      throw new AppError(401, "Session is no longer active", "SESSION_INACTIVE");
    }

    (req as AuthenticatedRequest).auth = {
      userId: payload.sub,
      sessionId: payload.sessionId,
      email: session.user.email,
    };

    await prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    next();
  } catch (error) {
    next(error);
  }
};
