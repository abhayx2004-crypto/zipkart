import type { Request, Response } from "express";
import { UserRoleName } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma.db";
import { serializeRole } from "../../services/user.serializer";
import { AppError, sendSuccess } from "../../shared/http";
import { requireString, requireUuid } from "../../shared/validation";

const parseRole = (value: unknown) => {
  const role = requireString(value, "role").toLowerCase();

  switch (role) {
    case "buyer":
      return UserRoleName.BUYER;
    case "seller":
      return UserRoleName.SELLER;
    case "admin":
      return UserRoleName.ADMIN;
    default:
      throw new AppError(
        400,
        "role must be one of buyer, seller, admin",
        "INVALID_ROLE",
      );
  }
};

export const listUserRoles = async (req: Request, res: Response) => {
  const userId = requireUuid(req.params.userId, "userId");
  const roles = await prisma.userRole.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  sendSuccess(res, { roles: roles.map(serializeRole) });
};

export const assignUserRole = async (req: Request, res: Response) => {
  const userId = requireUuid(req.params.userId, "userId");
  const role = await prisma.userRole.create({
    data: {
      userId,
      role: parseRole(req.body.role),
    },
  });

  sendSuccess(res, { role: serializeRole(role) }, 201);
};

export const deleteRole = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);
  const role = await prisma.userRole.findUnique({ where: { id } });

  if (!role) {
    throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");
  }

  await prisma.userRole.delete({ where: { id } });

  sendSuccess(res, { id });
};
