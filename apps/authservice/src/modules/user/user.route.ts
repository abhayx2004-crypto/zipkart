import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/http";
import { getCurrentUser } from "./user.controller";

const userRouter = Router();

userRouter.get("/me", requireAuth, asyncHandler(getCurrentUser));

export { userRouter };
