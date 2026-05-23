import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/http";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  logoutAllDevices,
  refreshToken,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
} from "./auth.controller";

const authRouter = Router();

authRouter.post("/signup", asyncHandler(signup));
authRouter.post("/login", asyncHandler(login));
authRouter.post("/verify-email", asyncHandler(verifyEmail));
authRouter.post("/refresh-token", asyncHandler(refreshToken));
authRouter.post("/forgot-password", asyncHandler(forgotPassword));
authRouter.post("/reset-password", asyncHandler(resetPassword));
authRouter.post("/resend-verification", asyncHandler(resendVerification));
authRouter.post("/logout", requireAuth, asyncHandler(logout));
authRouter.post("/logout-all", requireAuth, asyncHandler(logoutAllDevices));
authRouter.post("/change-password", requireAuth, asyncHandler(changePassword));

export { authRouter };
