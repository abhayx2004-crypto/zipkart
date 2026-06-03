import { Router } from "express";
import { asyncHandler } from "../../shared/http";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from "./user.controller";

export const userRouter = Router();

userRouter.get("/", asyncHandler(listUsers));
userRouter.post("/", asyncHandler(createUser));
userRouter.get("/:id", asyncHandler(getUserById));
userRouter.patch("/:id", asyncHandler(updateUser));
userRouter.delete("/:id", asyncHandler(deleteUser));
