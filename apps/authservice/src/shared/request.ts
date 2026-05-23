import type { Request } from "express";

export const getClientIp = (req: Request) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? req.ip;
  }

  return req.ip;
};

export const getRefreshTokenFromRequest = (req: Request) => {
  const body = req.body as { refreshToken?: unknown };

  if (typeof body.refreshToken === "string") {
    return body.refreshToken;
  }

  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      return [name, decodeURIComponent(valueParts.join("="))];
    }),
  );

  return cookies.refreshToken;
};
