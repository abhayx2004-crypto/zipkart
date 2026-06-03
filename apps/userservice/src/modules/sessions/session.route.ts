import { Router } from "express";
import { asyncHandler } from "../../shared/http";
import {
  createUserSession,
  deleteSession,
  getSessionById,
  listUserSessions,
} from "./session.controller";

export const userSessionRouter = Router({ mergeParams: true });
export const sessionRouter = Router();

userSessionRouter.get("/", asyncHandler(listUserSessions));
userSessionRouter.post("/", asyncHandler(createUserSession));

sessionRouter.get("/:id", asyncHandler(getSessionById));
sessionRouter.delete("/:id", asyncHandler(deleteSession));
