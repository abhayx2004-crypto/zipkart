import { AppError } from "./http";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export const optionalString = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be a string`, "VALIDATION_ERROR");
  }

  return value.trim();
};

export const optionalBoolean = (value: unknown, field: string) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new AppError(400, `${field} must be a boolean`, "VALIDATION_ERROR");
  }

  return value;
};

export const optionalNumber = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(400, `${field} must be a number`, "VALIDATION_ERROR");
  }

  return value;
};

export const requireDate = (value: unknown, field: string) => {
  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be an ISO date string`, "VALIDATION_ERROR");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `${field} must be a valid date`, "VALIDATION_ERROR");
  }

  return date;
};

export const requireUuid = (value: unknown, field = "id") => {
  if (typeof value !== "string" || !uuidRegex.test(value)) {
    throw new AppError(400, `${field} must be a valid UUID`, "VALIDATION_ERROR");
  }

  return value;
};
