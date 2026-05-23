type UserWithRoles = {
  id: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userRoles?: Array<{ role: { name: string; description: string | null } }>;
};

export const serializeUser = (user: UserWithRoles) => ({
  id: user.id,
  email: user.email,
  isVerified: user.isVerified,
  isActive: user.isActive,
  roles: user.userRoles?.map(({ role }) => ({
    name: role.name,
    description: role.description,
  })) ?? [],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
