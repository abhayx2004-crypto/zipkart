import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.db";
import { serializeUser } from "../../services/user.serializer";
import { AppError, sendSuccess } from "../../shared/http";
import {
  normalizeEmail,
  optionalBoolean,
  optionalString,
  requireString,
  requireUuid,
} from "../../shared/validation";

export const listUsers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  sendSuccess(res, { users: users.map(serializeUser) });
};

export const createUser = async (req: Request, res: Response) => {
  const user = await prisma.user.create({
    data: {
      email: normalizeEmail(req.body.email),
      phone: optionalString(req.body.phone, "phone"),
      passwordHash: requireString(req.body.passwordHash, "passwordHash", 8),
      fullName: requireString(req.body.fullName, "fullName"),
      avatarUrl: optionalString(req.body.avatarUrl, "avatarUrl"),
      isVerified: optionalBoolean(req.body.isVerified, "isVerified") ?? false,
    },
  });

  sendSuccess(res, { user: serializeUser(user) }, 201);
};

export const getUserById = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  sendSuccess(res, { user: serializeUser(user) });
};

export const updateUser = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);
  const data = {
    email:
      req.body.email === undefined ? undefined : normalizeEmail(req.body.email),
    phone: optionalString(req.body.phone, "phone"),
    passwordHash: optionalString(req.body.passwordHash, "passwordHash"),
    fullName: optionalString(req.body.fullName, "fullName"),
    avatarUrl: optionalString(req.body.avatarUrl, "avatarUrl"),
    isVerified: optionalBoolean(req.body.isVerified, "isVerified"),
  };

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  sendSuccess(res, { user: serializeUser(user) });
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);

  await prisma.user.delete({ where: { id } });

  sendSuccess(res, { id });
};
