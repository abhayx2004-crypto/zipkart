import { AppError } from "./http";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: unknown) => {
  if (typeof email !== "string" || !emailRegex.test(email.trim())) {
    throw new AppError(400, "A valid email is required", "INVALID_EMAIL");
  }

  return email.trim().toLowerCase();
};

export const requireString = (
  value: unknown,
  field: string,
  minLength = 1,
) => {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new AppError(400, `${field} is required`, "VALIDATION_ERROR");
  }

  return value.trim();
};

export const requirePassword = (value: unknown, field = "Password") => {
  if (typeof value !== "string" || value.length < 8) {
    throw new AppError(
      400,
      `${field} must be at least 8 characters`,
      "WEAK_PASSWORD",
    );
  }

  return value;
};
