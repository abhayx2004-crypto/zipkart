import { redis } from "../db/redis.db";
import { config } from "../config/env.config";
import {
  generateOpaqueToken,
  hashToken,
  signAccessToken,
} from "./crypto.service";

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const refreshTokenTtlSeconds = () =>
  Math.max(1, config.refreshTokenTtlDays * 24 * 60 * 60);

const refreshTokenKey = (tokenHash: string) =>
  `auth:refresh-token:${tokenHash}`;

const rotatedRefreshTokenKey = (tokenHash: string) =>
  `auth:refresh-token:rotated:${tokenHash}`;

const sessionRefreshTokensKey = (sessionId: string) =>
  `auth:session:${sessionId}:refresh-tokens`;

type TokenPairInput = {
  userId: string;
  email: string;
  sessionId: string;
};

type StoredRefreshToken = {
  tokenHash: string;
  sessionId: string;
  expiresAt: string;
  createdAt: string;
};

const storeRefreshTokenRecord = async (
  sessionId: string,
  tokenHash: string,
  expiresAt: Date,
) => {
  const ttlSeconds = refreshTokenTtlSeconds();
  const record: StoredRefreshToken = {
    tokenHash,
    sessionId,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
  const sessionKey = sessionRefreshTokensKey(sessionId);

  await redis
    .multi()
    .set(refreshTokenKey(tokenHash), JSON.stringify(record), "EX", ttlSeconds)
    .sadd(sessionKey, tokenHash)
    .expire(sessionKey, ttlSeconds)
    .exec();
};

export const createRefreshToken = async (sessionId: string) => {
  const token = generateOpaqueToken();
  const expiresAt = addDays(new Date(), config.refreshTokenTtlDays);
  const tokenHash = hashToken(token);

  await storeRefreshTokenRecord(sessionId, tokenHash, expiresAt);

  return { token, tokenHash, expiresAt };
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

export const getStoredRefreshToken = async (token: string) => {
  const tokenHash = hashToken(token);
  const record = await redis.get(refreshTokenKey(tokenHash));

  if (!record) {
    const rotatedRecord = await redis.get(rotatedRefreshTokenKey(tokenHash));

    return {
      tokenHash,
      record: null,
      rotatedSessionId: rotatedRecord,
    };
  }

  return {
    tokenHash,
    record: JSON.parse(record) as StoredRefreshToken,
    rotatedSessionId: null,
  };
};

export const rotateRefreshToken = async (
  oldTokenHash: string,
  sessionId: string,
) => {
  const token = generateOpaqueToken();
  const newTokenHash = hashToken(token);
  const expiresAt = addDays(new Date(), config.refreshTokenTtlDays);
  const ttlSeconds = refreshTokenTtlSeconds();

  await redis
    .multi()
    .del(refreshTokenKey(oldTokenHash))
    .srem(sessionRefreshTokensKey(sessionId), oldTokenHash)
    .set(rotatedRefreshTokenKey(oldTokenHash), sessionId, "EX", ttlSeconds)
    .exec();
  await storeRefreshTokenRecord(sessionId, newTokenHash, expiresAt);

  return {
    token,
    tokenHash: newTokenHash,
    expiresAt,
  };
};

export const revokeSessionTokens = async (sessionId: string) => {
  const sessionKey = sessionRefreshTokensKey(sessionId);
  const tokenHashes = await redis.smembers(sessionKey);

  if (tokenHashes.length === 0) {
    await redis.del(sessionKey);
    return;
  }

  await redis
    .multi()
    .del(...tokenHashes.map(refreshTokenKey))
    .del(sessionKey)
    .exec();
};

export const revokeSessionsTokens = async (sessionIds: string[]) => {
  await Promise.all(sessionIds.map((sessionId) => revokeSessionTokens(sessionId)));
};
