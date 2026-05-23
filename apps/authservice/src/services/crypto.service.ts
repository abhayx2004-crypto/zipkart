import {
  createHmac,
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { config } from "../config/env.config";
import { AppError } from "../shared/http";

const scrypt = promisify(scryptCallback);
const passwordKeyLength = 64;

type AccessTokenPayload = {
  sub: string;
  sessionId: string;
  email: string;
  iat: number;
  exp: number;
};

const base64Url = (input: Buffer | string) =>
  Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const parseBase64UrlJson = <T>(value: string): T => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as T;
};

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, passwordKeyLength)) as Buffer;

  return `scrypt:${salt}:${key.toString("hex")}`;
};

export const verifyPassword = async (password: string, storedHash: string) => {
  const [algorithm, salt, hash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const key = (await scrypt(password, salt, passwordKeyLength)) as Buffer;
  const storedKey = Buffer.from(hash, "hex");

  return key.length === storedKey.length && timingSafeEqual(key, storedKey);
};

export const generateOpaqueToken = (bytes = 48) => base64Url(randomBytes(bytes));

export const generateVerificationCode = () =>
  randomInt(100000, 1000000).toString();

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const signAccessToken = (
  payload: Pick<AccessTokenPayload, "sub" | "sessionId" | "email">,
) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body: AccessTokenPayload = {
    ...payload,
    iat: now,
    exp: now + config.accessTokenTtlSeconds,
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(body),
  )}`;
  const signature = createHmac("sha256", config.accessTokenSecret)
    .update(unsignedToken)
    .digest();

  return `${unsignedToken}.${base64Url(signature)}`;
};

export const verifyAccessToken = (token: string) => {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    throw new AppError(401, "Invalid access token", "INVALID_ACCESS_TOKEN");
  }

  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = base64Url(
    createHmac("sha256", config.accessTokenSecret)
      .update(unsignedToken)
      .digest(),
  );

  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AppError(401, "Invalid access token", "INVALID_ACCESS_TOKEN");
  }

  const parsedPayload = parseBase64UrlJson<AccessTokenPayload>(payload);

  if (parsedPayload.exp <= Math.floor(Date.now() / 1000)) {
    throw new AppError(401, "Access token expired", "ACCESS_TOKEN_EXPIRED");
  }

  return parsedPayload;
};
