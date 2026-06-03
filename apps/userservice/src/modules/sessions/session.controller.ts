import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.db";
import { serializeSession } from "../../services/user.serializer";
import { AppError, sendSuccess } from "../../shared/http";
import {
  optionalString,
  requireDate,
  requireString,
  requireUuid,
} from "../../shared/validation";

export const listUserSessions = async (req: Request, res: Response) => {
  const userId = requireUuid(req.params.userId, "userId");
  const sessions = await prisma.userSession.findMany({
    where: { userId },
    orderBy: { expiresAt: "desc" },
  });

  sendSuccess(res, { sessions: sessions.map(serializeSession) });
};

export const createUserSession = async (req: Request, res: Response) => {
  const userId = requireUuid(req.params.userId, "userId");
  const session = await prisma.userSession.create({
    data: {
      userId,
      tokenHash: requireString(req.body.tokenHash, "tokenHash", 8),
      deviceInfo: optionalString(req.body.deviceInfo, "deviceInfo"),
      ipAddress: optionalString(req.body.ipAddress, "ipAddress"),
      expiresAt: requireDate(req.body.expiresAt, "expiresAt"),
    },
  });

  sendSuccess(res, { session: serializeSession(session) }, 201);
};

export const getSessionById = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);
  const session = await prisma.userSession.findUnique({ where: { id } });

  if (!session) {
    throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
  }

  sendSuccess(res, { session: serializeSession(session) });
};

export const deleteSession = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);
  const session = await prisma.userSession.findUnique({ where: { id } });

  if (!session) {
    throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
  }

  await prisma.userSession.delete({ where: { id } });

  sendSuccess(res, { id });
};
