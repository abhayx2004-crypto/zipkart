import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.db";
import { config } from "../../config/env.config";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../config/resend.config";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { createTokenPair, revokeSessionTokens } from "../../services/auth-token.service";
import {
  generateOpaqueToken,
  generateVerificationCode,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyPassword,
} from "../../services/crypto.service";
import { serializeUser } from "../../services/user.serializer";
import { AppError, sendSuccess } from "../../shared/http";
import { getClientIp, getRefreshTokenFromRequest } from "../../shared/request";
import {
  normalizeEmail,
  requirePassword,
  requireString,
} from "../../shared/validation";

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const verificationExpiry = () =>
  addMinutes(new Date(), config.verificationTokenTtlMinutes);

const passwordResetExpiry = () =>
  addMinutes(new Date(), config.passwordResetTokenTtlMinutes);

const genericPasswordResetResponse = {
  message: "If that account exists, a password reset code has been sent",
};

export const signup = async (req: Request, res: Response) => {
  const body = req.body as {
    email?: unknown;
    password?: unknown;
    deviceName?: unknown;
  };
  const email = normalizeEmail(body.email);
  const password = requirePassword(body.password);
  const deviceName =
    typeof body.deviceName === "string" ? body.deviceName.trim() : undefined;

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError(409, "Email is already registered", "EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(password);
  const verificationCode = generateVerificationCode();
  const tokenHash = hashToken(verificationCode);

  const user = await prisma.$transaction(async (tx) => {
    const defaultRole = await tx.role.upsert({
      where: { name: "user" },
      update: {},
      create: { name: "user", description: "Default customer account" },
    });
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        userRoles: {
          create: { roleId: defaultRole.id },
        },
        emailTokens: {
          create: {
            tokenHash,
            expiresAt: verificationExpiry(),
          },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    return createdUser;
  });

  await sendVerificationEmail(email, verificationCode);

  sendSuccess(res, { user: serializeUser(user) }, 201);
};

export const login = async (req: Request, res: Response) => {
  const body = req.body as {
    email?: unknown;
    password?: unknown;
    deviceName?: unknown;
  };
  const email = normalizeEmail(body.email);
  const password = requireString(body.password, "Password");
  const deviceName =
    typeof body.deviceName === "string" ? body.deviceName.trim() : undefined;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError(403, "Account is disabled", "ACCOUNT_DISABLED");
  }

  if (!user.isVerified) {
    throw new AppError(403, "Email verification required", "EMAIL_NOT_VERIFIED");
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      deviceName,
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
      expiresAt: addDays(new Date(), config.refreshTokenTtlDays),
      lastUsedAt: new Date(),
    },
  });
  const tokens = await createTokenPair({
    userId: user.id,
    email: user.email,
    sessionId: session.id,
  });

  sendSuccess(res, { user: serializeUser(user), sessionId: session.id, tokens });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const body = req.body as { email?: unknown; code?: unknown };
  const email = normalizeEmail(body.email);
  const code = requireString(body.code, "Verification code");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(400, "Invalid verification code", "INVALID_CODE");
  }

  const token = await prisma.emailVerification.findFirst({
    where: {
      userId: user.id,
      tokenHash: hashToken(code),
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!token) {
    throw new AppError(400, "Invalid verification code", "INVALID_CODE");
  }

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: token.id },
      data: { used: true, usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    }),
  ]);

  sendSuccess(res, { message: "Email verified successfully" });
};

export const refreshToken = async (req: Request, res: Response) => {
  const rawRefreshToken = getRefreshTokenFromRequest(req);

  if (!rawRefreshToken) {
    throw new AppError(401, "Refresh token is required", "REFRESH_REQUIRED");
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawRefreshToken) },
    include: { session: { include: { user: true } } },
  });

  if (!storedToken) {
    throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  if (storedToken.revoked) {
    await prisma.session.updateMany({
      where: { id: storedToken.sessionId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
    throw new AppError(401, "Refresh token was revoked", "REFRESH_REVOKED");
  }

  if (
    storedToken.expiresAt <= new Date() ||
    storedToken.session.revoked ||
    storedToken.session.expiresAt <= new Date() ||
    !storedToken.session.user.isActive
  ) {
    throw new AppError(401, "Refresh token expired", "REFRESH_EXPIRED");
  }

  const newRawRefreshToken = generateOpaqueToken();
  const newRefreshTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = addDays(new Date(), config.refreshTokenTtlDays);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const newToken = await tx.refreshToken.create({
      data: {
        sessionId: storedToken.sessionId,
        tokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    await tx.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revoked: true,
        revokedAt: now,
        replacedByTokenId: newToken.id,
      },
    });

    await tx.session.update({
      where: { id: storedToken.sessionId },
      data: { lastUsedAt: now },
    });
  });

  const accessToken = signAccessToken({
    sub: storedToken.session.user.id,
    email: storedToken.session.user.email,
    sessionId: storedToken.sessionId,
  });

  sendSuccess(res, {
    tokens: {
      accessToken,
      refreshToken: newRawRefreshToken,
      accessTokenExpiresIn: config.accessTokenTtlSeconds,
    },
  });
};

export const logout = async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const now = new Date();

  await prisma.session.updateMany({
    where: { id: auth.sessionId, userId: auth.userId, revoked: false },
    data: { revoked: true, revokedAt: now },
  });
  await revokeSessionTokens(auth.sessionId, now);

  sendSuccess(res, { message: "Logged out successfully" });
};

export const logoutAllDevices = async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: { userId: auth.userId, revoked: false },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.session.updateMany({
      where: { userId: auth.userId, revoked: false },
      data: { revoked: true, revokedAt: now },
    }),
    prisma.refreshToken.updateMany({
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      data: { revoked: true, revokedAt: now },
    }),
  ]);

  sendSuccess(res, { message: "Logged out from all devices" });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const body = req.body as { email?: unknown };
  const email = normalizeEmail(body.email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    sendSuccess(res, genericPasswordResetResponse);
    return;
  }

  const resetCode = generateVerificationCode();
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(resetCode),
      expiresAt: passwordResetExpiry(),
    },
  });
  await sendPasswordResetEmail(email, resetCode);

  sendSuccess(res, genericPasswordResetResponse);
};

export const resetPassword = async (req: Request, res: Response) => {
  const body = req.body as {
    email?: unknown;
    code?: unknown;
    newPassword?: unknown;
  };
  const email = normalizeEmail(body.email);
  const code = requireString(body.code, "Reset code");
  const newPassword = requirePassword(body.newPassword, "New password");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(400, "Invalid reset code", "INVALID_RESET_CODE");
  }

  const resetToken = await prisma.passwordReset.findFirst({
    where: {
      userId: user.id,
      tokenHash: hashToken(code),
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetToken) {
    throw new AppError(400, "Invalid reset code", "INVALID_RESET_CODE");
  }

  const passwordHash = await hashPassword(newPassword);
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, revoked: false },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);

  await prisma.$transaction([
    prisma.passwordReset.update({
      where: { id: resetToken.id },
      data: { used: true, usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.session.updateMany({
      where: { id: { in: sessionIds } },
      data: { revoked: true, revokedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { sessionId: { in: sessionIds } },
      data: { revoked: true, revokedAt: new Date() },
    }),
  ]);

  sendSuccess(res, { message: "Password reset successfully" });
};

export const resendVerification = async (req: Request, res: Response) => {
  const body = req.body as { email?: unknown };
  const email = normalizeEmail(body.email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.isVerified || !user.isActive) {
    sendSuccess(res, {
      message: "If verification is required, a code has been sent",
    });
    return;
  }

  const verificationCode = generateVerificationCode();
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(verificationCode),
      expiresAt: verificationExpiry(),
    },
  });
  await sendVerificationEmail(email, verificationCode);

  sendSuccess(res, { message: "Verification code sent" });
};

export const changePassword = async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const body = req.body as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const currentPassword = requireString(body.currentPassword, "Current password");
  const newPassword = requirePassword(body.newPassword, "New password");
  const user = await prisma.user.findUnique({ where: { id: auth.userId } });

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError(401, "Current password is incorrect", "INVALID_PASSWORD");
  }

  const passwordHash = await hashPassword(newPassword);
  const sessions = await prisma.session.findMany({
    where: {
      userId: auth.userId,
      revoked: false,
      id: { not: auth.sessionId },
    },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: auth.userId },
      data: { passwordHash },
    }),
    prisma.session.updateMany({
      where: { id: { in: sessionIds } },
      data: { revoked: true, revokedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { sessionId: { in: sessionIds } },
      data: { revoked: true, revokedAt: new Date() },
    }),
  ]);

  sendSuccess(res, { message: "Password changed successfully" });
};
