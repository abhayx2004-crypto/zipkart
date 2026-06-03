import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.db";
import { serializeAddress } from "../../services/user.serializer";
import { AppError, sendSuccess } from "../../shared/http";
import {
  optionalBoolean,
  optionalNumber,
  optionalString,
  requireString,
  requireUuid,
} from "../../shared/validation";

const buildCreateAddressData = (body: Record<string, unknown>) => ({
  label: requireString(body.label, "label"),
  street: requireString(body.street, "street"),
  city: requireString(body.city, "city"),
  state: requireString(body.state, "state"),
  country: requireString(body.country, "country"),
  postalCode: requireString(body.postalCode, "postalCode"),
  isDefault: optionalBoolean(body.isDefault, "isDefault") ?? false,
  lat: optionalNumber(body.lat, "lat"),
  lng: optionalNumber(body.lng, "lng"),
});

const buildUpdateAddressData = (body: Record<string, unknown>) => ({
  label: optionalString(body.label, "label"),
  street: optionalString(body.street, "street"),
  city: optionalString(body.city, "city"),
  state: optionalString(body.state, "state"),
  country: optionalString(body.country, "country"),
  postalCode: optionalString(body.postalCode, "postalCode"),
  isDefault: optionalBoolean(body.isDefault, "isDefault"),
  lat: optionalNumber(body.lat, "lat"),
  lng: optionalNumber(body.lng, "lng"),
});

export const listUserAddresses = async (req: Request, res: Response) => {
  const userId = requireUuid(req.params.userId, "userId");
  const addresses = await prisma.userAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });

  sendSuccess(res, { addresses: addresses.map(serializeAddress) });
};

export const createUserAddress = async (req: Request, res: Response) => {
  const userId = requireUuid(req.params.userId, "userId");
  const data = buildCreateAddressData(req.body);

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return tx.userAddress.create({
      data: {
        ...data,
        userId,
      },
    });
  });

  sendSuccess(res, { address: serializeAddress(address) }, 201);
};

export const getAddressById = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);
  const address = await prisma.userAddress.findUnique({ where: { id } });

  if (!address) {
    throw new AppError(404, "Address not found", "ADDRESS_NOT_FOUND");
  }

  sendSuccess(res, { address: serializeAddress(address) });
};

export const updateAddress = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);
  const data = buildUpdateAddressData(req.body);

  const address = await prisma.$transaction(async (tx) => {
    const existing = await tx.userAddress.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError(404, "Address not found", "ADDRESS_NOT_FOUND");
    }

    if (data.isDefault) {
      await tx.userAddress.updateMany({
        where: { userId: existing.userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.userAddress.update({ where: { id }, data });
  });

  sendSuccess(res, { address: serializeAddress(address) });
};

export const deleteAddress = async (req: Request, res: Response) => {
  const id = requireUuid(req.params.id);
  const address = await prisma.userAddress.findUnique({ where: { id } });

  if (!address) {
    throw new AppError(404, "Address not found", "ADDRESS_NOT_FOUND");
  }

  await prisma.userAddress.delete({ where: { id } });

  sendSuccess(res, { id });
};
