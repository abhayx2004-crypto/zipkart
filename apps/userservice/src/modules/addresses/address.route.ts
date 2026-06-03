import { Router } from "express";
import { asyncHandler } from "../../shared/http";
import {
  createUserAddress,
  deleteAddress,
  getAddressById,
  listUserAddresses,
  updateAddress,
} from "./address.controller";

export const userAddressRouter = Router({ mergeParams: true });
export const addressRouter = Router();

userAddressRouter.get("/", asyncHandler(listUserAddresses));
userAddressRouter.post("/", asyncHandler(createUserAddress));

addressRouter.get("/:id", asyncHandler(getAddressById));
addressRouter.patch("/:id", asyncHandler(updateAddress));
addressRouter.delete("/:id", asyncHandler(deleteAddress));
