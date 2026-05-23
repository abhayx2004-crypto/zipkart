import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { prisma } from "../../db/prisma.db";
import { serializeUser } from "../../services/user.serializer";
import { AppError, sendSuccess } from "../../shared/http";

export const getCurrentUser = async (
  req: Request,
  res: Response,
) => {
  const auth = (req as AuthenticatedRequest).auth;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  sendSuccess(res, { user: serializeUser(user) });
};
