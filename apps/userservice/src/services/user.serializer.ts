import type {
  User,
  UserAddress,
  UserRole,
  UserRoleName,
  UserSession,
} from "../generated/prisma/client";

const roleToApi = (role: UserRoleName) => role.toLowerCase();

export const serializeUser = (user: User) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const serializeAddress = (address: UserAddress) => ({
  id: address.id,
  userId: address.userId,
  label: address.label,
  street: address.street,
  city: address.city,
  state: address.state,
  country: address.country,
  postalCode: address.postalCode,
  isDefault: address.isDefault,
  lat: address.lat,
  lng: address.lng,
});

export const serializeSession = (session: UserSession) => ({
  id: session.id,
  userId: session.userId,
  tokenHash: session.tokenHash,
  deviceInfo: session.deviceInfo,
  ipAddress: session.ipAddress,
  expiresAt: session.expiresAt,
});

export const serializeRole = (role: UserRole) => ({
  id: role.id,
  userId: role.userId,
  role: roleToApi(role.role),
  createdAt: role.createdAt,
});
