import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  role: {
    upsert: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  emailVerification: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  passwordReset: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

const redisMultiMock = {
  set: vi.fn(),
  sadd: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  srem: vi.fn(),
  exec: vi.fn(),
};

const redisMock = {
  get: vi.fn(),
  smembers: vi.fn(),
  del: vi.fn(),
  multi: vi.fn(),
};

vi.mock("../src/db/prisma.db", () => ({
  prisma: prismaMock,
}));

vi.mock("../src/db/redis.db", () => ({
  redis: redisMock,
}));

vi.mock("@repo/logger/src/middleware", () => ({
  httpLogger: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock("../src/config/resend.config", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/services/crypto.service", async () => {
  const actual = await vi.importActual("../src/services/crypto.service");
  return {
    ...actual,
    verifyAccessToken: vi.fn(),
    signAccessToken: vi.fn(),
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
    generateVerificationCode: vi.fn(),
    generateOpaqueToken: vi.fn(),
    hashToken: vi.fn(),
  };
});

describe("Authservice API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMultiMock.set.mockReturnValue(redisMultiMock);
    redisMultiMock.sadd.mockReturnValue(redisMultiMock);
    redisMultiMock.expire.mockReturnValue(redisMultiMock);
    redisMultiMock.del.mockReturnValue(redisMultiMock);
    redisMultiMock.srem.mockReturnValue(redisMultiMock);
    redisMultiMock.exec.mockResolvedValue([]);
    redisMock.multi.mockReturnValue(redisMultiMock);
    redisMock.smembers.mockResolvedValue([]);
    redisMock.del.mockResolvedValue(1);
  });

  it("GET / returns health payload", async () => {
    const { createApp } = await import("../src/app");
    const response = await request(createApp()).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ service: "authservice", status: "ok" });
  });

  it("POST /api/auth/signup creates user", async () => {
    const cryptoService = await import("../src/services/crypto.service");
    const { createApp } = await import("../src/app");
    vi.mocked(cryptoService.hashPassword).mockResolvedValue("hashed-password");
    vi.mocked(cryptoService.generateVerificationCode).mockReturnValue("123456");
    vi.mocked(cryptoService.hashToken).mockReturnValue("hashed-code");
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback({
        ...prismaMock,
        role: { upsert: vi.fn().mockResolvedValue({ id: "role-1" }) },
        user: {
          ...prismaMock.user,
          create: vi.fn().mockResolvedValue({
            id: "user-1",
            email: "user@example.com",
            isVerified: false,
            isActive: true,
            userRoles: [{ role: { name: "user", description: "Default customer account" } }],
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
      }),
    );

    const response = await request(createApp()).post("/api/auth/signup").send({
      email: "user@example.com",
      password: "password123",
      deviceName: "Chrome",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("user@example.com");
  });

  it("POST /api/auth/login returns tokens", async () => {
    const cryptoService = await import("../src/services/crypto.service");
    const tokenService = await import("../src/services/auth-token.service");
    const { createApp } = await import("../src/app");
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hash",
      isActive: true,
      isVerified: true,
      userRoles: [{ role: { name: "user", description: null } }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(cryptoService.verifyPassword).mockResolvedValue(true);
    prismaMock.session.create.mockResolvedValue({ id: "session-1" });
    vi.spyOn(tokenService, "createTokenPair").mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExpiresIn: 900,
    });

    const response = await request(createApp()).post("/api/auth/login").send({
      email: "user@example.com",
      password: "password123",
      deviceName: "Chrome",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.tokens.accessToken).toBe("access");
  });

  it("POST /api/auth/verify-email marks token used", async () => {
    const cryptoService = await import("../src/services/crypto.service");
    const { createApp } = await import("../src/app");
    vi.mocked(cryptoService.hashToken).mockReturnValue("hashed-code");
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
    prismaMock.emailVerification.findFirst.mockResolvedValue({ id: "ev-1" });
    prismaMock.$transaction.mockResolvedValue(undefined);

    const response = await request(createApp()).post("/api/auth/verify-email").send({
      email: "user@example.com",
      code: "123456",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.message).toContain("verified");
  });

  it("POST /api/auth/refresh-token rotates token", async () => {
    const cryptoService = await import("../src/services/crypto.service");
    const { createApp } = await import("../src/app");
    vi.mocked(cryptoService.hashToken).mockReturnValue("hashed-refresh");
    vi.mocked(cryptoService.generateOpaqueToken).mockReturnValue("new-refresh");
    vi.mocked(cryptoService.signAccessToken).mockReturnValue("new-access");
    redisMock.get.mockResolvedValue(JSON.stringify({
      tokenHash: "hashed-refresh",
      sessionId: "session-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    }));
    prismaMock.session.findFirst.mockResolvedValue({
      id: "session-1",
      revoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "user-1", email: "user@example.com", isActive: true },
    });
    prismaMock.session.update.mockResolvedValue({});

    const response = await request(createApp())
      .post("/api/auth/refresh-token")
      .send({ refreshToken: "old-refresh" });

    expect(response.status).toBe(200);
    expect(response.body.data.tokens.refreshToken).toBe("new-refresh");
  });

  it("POST /api/auth/forgot-password returns generic response", async () => {
    const { createApp } = await import("../src/app");
    prismaMock.user.findUnique.mockResolvedValue(null);
    const response = await request(createApp()).post("/api/auth/forgot-password").send({
      email: "user@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.message).toContain("If that account exists");
  });

  it("POST /api/auth/reset-password resets credentials", async () => {
    const cryptoService = await import("../src/services/crypto.service");
    const { createApp } = await import("../src/app");
    vi.mocked(cryptoService.hashToken).mockReturnValue("reset-hash");
    vi.mocked(cryptoService.hashPassword).mockResolvedValue("new-hash");
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
    prismaMock.passwordReset.findFirst.mockResolvedValue({ id: "pr-1" });
    prismaMock.session.findMany.mockResolvedValue([{ id: "session-1" }]);
    prismaMock.$transaction.mockResolvedValue(undefined);

    const response = await request(createApp()).post("/api/auth/reset-password").send({
      email: "user@example.com",
      code: "123456",
      newPassword: "newpassword123",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.message).toContain("reset");
  });

  it("POST /api/auth/resend-verification handles generic success", async () => {
    const { createApp } = await import("../src/app");
    prismaMock.user.findUnique.mockResolvedValue(null);
    const response = await request(createApp()).post("/api/auth/resend-verification").send({
      email: "user@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("auth-protected endpoints work with mocked bearer token", async () => {
    const cryptoService = await import("../src/services/crypto.service");
    const { createApp } = await import("../src/app");
    vi.mocked(cryptoService.verifyAccessToken).mockReturnValue({
      sub: "user-1",
      sessionId: "session-1",
      email: "user@example.com",
      iat: 1,
      exp: 9_999_999_999,
    });
    prismaMock.session.findFirst.mockResolvedValue({
      id: "session-1",
      user: { email: "user@example.com" },
    });
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      isVerified: true,
      isActive: true,
      userRoles: [{ role: { name: "user", description: null } }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        deviceName: "Chrome",
        ipAddress: "127.0.0.1",
        userAgent: "UA",
        expiresAt: new Date(),
        revoked: false,
        revokedAt: null,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      },
    ]);
    prismaMock.session.updateMany.mockResolvedValue({});
    prismaMock.refreshToken.updateMany.mockResolvedValue({});
    prismaMock.$transaction.mockResolvedValue(undefined);

    const authHeader = { Authorization: "Bearer valid-token" };

    const me = await request(createApp()).get("/api/users/me").set(authHeader);
    expect(me.status).toBe(200);

    const sessions = await request(createApp())
      .get("/api/sessions")
      .set(authHeader);
    expect(sessions.status).toBe(200);

    const revoke = await request(createApp())
      .delete("/api/sessions/another-session")
      .set(authHeader);
    expect(revoke.status).toBe(200);

    const logout = await request(createApp())
      .post("/api/auth/logout")
      .set(authHeader);
    expect(logout.status).toBe(200);

    const logoutAll = await request(createApp())
      .post("/api/auth/logout-all")
      .set(authHeader);
    expect(logoutAll.status).toBe(200);

    const cryptoServiceForChange = await import("../src/services/crypto.service");
    vi.mocked(cryptoServiceForChange.verifyPassword).mockResolvedValue(true);
    vi.mocked(cryptoServiceForChange.hashPassword).mockResolvedValue("new-hash");
    const changePassword = await request(createApp())
      .post("/api/auth/change-password")
      .set(authHeader)
      .send({ currentPassword: "oldpassword", newPassword: "newpassword123" });
    expect(changePassword.status).toBe(200);
  });
});
