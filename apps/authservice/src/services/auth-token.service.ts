import { prisma } from "../db/prisma.db";
import { config } from "../config/env.config";
import {
  generateOpaqueToken,
  hashToken,
  signAccessToken,
} from "./crypto.service";

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

type TokenPairInput = {
  userId: string;
  email: string;
  sessionId: string;
};

export const createRefreshToken = async (sessionId: string) => {
  const token = generateOpaqueToken();
  const expiresAt = addDays(new Date(), config.refreshTokenTtlDays);
  const refreshToken = await prisma.refreshToken.create({
    data: {
      sessionId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, refreshToken };
};

export const createTokenPair = async (input: TokenPairInput) => {
  const { token: refreshToken } = await createRefreshToken(input.sessionId);
  const accessToken = signAccessToken({
    sub: input.userId,
    sessionId: input.sessionId,
    email: input.email,
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: config.accessTokenTtlSeconds,
  };
};

export const revokeSessionTokens = async (sessionId: string, revokedAt = new Date()) => {
  await prisma.refreshToken.updateMany({
    where: { sessionId, revoked: false },
    data: { revoked: true, revokedAt },
  });
};
