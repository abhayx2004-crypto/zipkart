import { Router } from "express";
import { asyncHandler } from "../../shared/http";
import { assignUserRole, deleteRole, listUserRoles } from "./role.controller";

export const userRoleRouter = Router({ mergeParams: true });
export const roleRouter = Router();

userRoleRouter.get("/", asyncHandler(listUserRoles));
userRoleRouter.post("/", asyncHandler(assignUserRole));

roleRouter.delete("/:id", asyncHandler(deleteRole));
