import { Router } from "express";
import { getCurrentUserProfile } from "./user.controller";

export const userRouter = Router();

userRouter.get("/me", getCurrentUserProfile);
