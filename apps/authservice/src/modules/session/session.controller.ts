import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { prisma } from "../../db/prisma.db";
import { AppError, sendSuccess } from "../../shared/http";
import { requireString } from "../../shared/validation";

const serializeSession = (session: {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}) => ({
  id: session.id,
  deviceName: session.deviceName,
  ipAddress: session.ipAddress,
  userAgent: session.userAgent,
  expiresAt: session.expiresAt,
  revoked: session.revoked,
  revokedAt: session.revokedAt,
  createdAt: session.createdAt,
  lastUsedAt: session.lastUsedAt,
});

export const listSessions = async (
  req: Request,
  res: Response,
) => {
  const auth = (req as AuthenticatedRequest).auth;
  const sessions = await prisma.session.findMany({
    where: {
      userId: auth.userId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
  });

  sendSuccess(res, {
    currentSessionId: auth.sessionId,
    sessions: sessions.map(serializeSession),
  });
};

export const revokeSession = async (
  req: Request,
  res: Response,
) => {
  const auth = (req as AuthenticatedRequest).auth;
  const sessionId = requireString(req.params.sessionId, "Session id");

  if (sessionId === auth.sessionId) {
    throw new AppError(
      400,
      "Use logout to revoke the current session",
      "CURRENT_SESSION_REVOKE",
    );
  }

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: auth.userId,
      revoked: false,
    },
  });

  if (!session) {
    throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.session.update({
      where: { id: session.id },
      data: { revoked: true, revokedAt: now },
    }),
    prisma.refreshToken.updateMany({
      where: { sessionId: session.id, revoked: false },
      data: { revoked: true, revokedAt: now },
    }),
  ]);
  sendSuccess(res, { message: "Session revoked successfully" });
};
